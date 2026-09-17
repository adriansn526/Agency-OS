import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function decrypt(text: string) {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from('62b97af0f8223ab0d3b06fe7bb454781944cd8070e2f7904bc7921077d49c378', 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function main() {
  const settings = await prisma.anafSettings.findFirst()
  if (!settings) return;
  const token = decrypt(settings.accessToken)
  
  const listRes = await fetch('https://api.anaf.ro/prod/FCTEL/rest/listaMesajeFactura?zile=60&cif=18890424', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await listRes.json();
  const mesaje = data.mesaje || [];
  
  const typesCount: any = {};
  mesaje.forEach((m: any) => {
    typesCount[m.tip] = (typesCount[m.tip] || 0) + 1;
  });
  console.log("Mesaje gasite:", mesaje.length);
  console.log("Tipuri:", typesCount);
  
  // Sort by date created
  const emise = mesaje.filter((m: any) => m.tip === 'FACTURA EMISA');
  console.log("Emise:", emise);
}
main()
