const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const files = execSync('grep -rl "db.businessLine.findUnique({ where: { slug: businessLine } })" apps/web/app/api').toString().trim().split('\n');

for (const file of files) {
  if (!file) continue;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/db\.businessLine\.findUnique\(\{\s*where:\s*\{\s*slug:\s*businessLine\s*\}\s*\}\)/g, "db.businessLine.findFirst({ where: { OR: [{ id: businessLine }, { slug: businessLine }] } })");
  fs.writeFileSync(file, content);
  console.log('Fixed', file);
}
