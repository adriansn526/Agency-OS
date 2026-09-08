const { execSync } = require('child_process');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('apps/web/.env'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

if (fs.existsSync('apps/web/.env.local')) {
  const envLocalConfig = dotenv.parse(fs.readFileSync('apps/web/.env.local'));
  for (const k in envLocalConfig) {
    process.env[k] = envLocalConfig[k];
  }
}

execSync('npx prisma db push --schema packages/db/prisma/schema.prisma', { stdio: 'inherit' });
