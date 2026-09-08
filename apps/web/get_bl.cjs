const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.businessLine.findMany().then(r => console.log(r)).catch(console.error).finally(()=>process.exit(0));
