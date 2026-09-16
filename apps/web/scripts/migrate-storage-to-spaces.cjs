require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT;
const SPACES_REGION = process.env.SPACES_REGION || 'fra1';
const SPACES_KEY = process.env.SPACES_KEY;
const SPACES_SECRET = process.env.SPACES_SECRET;
const BUCKET_NAME = process.env.SPACES_BUCKET || 'agencyos';

if (!SPACES_ENDPOINT || !SPACES_KEY || !SPACES_SECRET) {
  console.error("❌ EROARE: Variabilele SPACES_* nu sunt setate in .env.local");
  process.exit(1);
}

const s3 = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  forcePathStyle: false,
});

async function fileExistsInSpaces(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    return true;
  } catch (err) {
    return false;
  }
}

async function uploadToSpaces(key, filePath) {
  const buffer = await fs.promises.readFile(filePath);
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: key.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
    ACL: 'private',
  });
  await s3.send(command);
}

// Funcție recursivă pentru a găsi toate fișierele
async function getFiles(dir) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

async function migrate() {
  console.log(`🚀 Incepem migrarea din public/uploads catre Spaces (${BUCKET_NAME})`);
  
  const baseDir = path.join(__dirname, '..', 'public', 'uploads');
  if (!fs.existsSync(baseDir)) {
    console.log(`✅ Niciun director ${baseDir} gasit. Posibil ca migrarea sa fie deja finalizata.`);
    process.exit(0);
  }

  const allFiles = await getFiles(baseDir);
  console.log(`📂 Gasite ${allFiles.length} fisiere de migrat.`);
  
  let successCount = 0;
  let failCount = 0;

  for (const filePath of allFiles) {
    // Calculăm cheia relativă (ex: bank-statements/...)
    // getFiles returneaza path absolut, trebuie sa extragem de la uploads/ incolo
    const relativeKey = path.relative(baseDir, filePath).replace(/\\/g, '/');
    
    // În DB, unele au /uploads/ la început? Din verificare am vazut doar "bank-statements/..."
    // Să lăsăm cheia curată așa cum e stocată în DB.
    const key = relativeKey; 

    try {
      console.log(`📤 Migrare: ${key} ...`);
      
      // Upload
      await uploadToSpaces(key, filePath);
      
      // Verificare
      const exists = await fileExistsInSpaces(key);
      if (!exists) {
        throw new Error("HEAD request a esuat dupa upload.");
      }
      
      // Stergere locala imediata
      await fs.promises.unlink(filePath);
      console.log(`✅ Succes: ${key} (sters local)`);
      successCount++;
      
    } catch (err) {
      console.error(`❌ ESUAT: ${key}`, err.message);
      failCount++;
    }
  }
  
  console.log(`\n🎉 Migrare finalizata!`);
  console.log(`✅ Reusite: ${successCount}`);
  console.log(`❌ Esuate: ${failCount}`);
  
  if (failCount === 0) {
    console.log(`🧹 Toate fisierele au fost migrate. Se sterge folderul uploads gol.`);
    try {
      fs.rmSync(baseDir, { recursive: true, force: true });
      console.log("✅ public/uploads sters complet.");
    } catch (err) {
      console.warn("⚠️ Nu s-a putut sterge folderul public/uploads (posibil in uz).");
    }
  }
}

migrate();
