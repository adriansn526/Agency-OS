const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/db\.businessLine\.findUnique\(\{\s*where:\s*\{\s*slug:\s*businessLineSlug\s*\}\s*\}\)/g, "db.businessLine.findFirst({ where: { OR: [{ id: businessLineSlug }, { slug: businessLineSlug }] } })");
  fs.writeFileSync(file, content);
  console.log('Fixed', file);
}

fix('apps/web/app/api/services/route.ts');
fix('apps/web/app/api/offer-templates/route.ts');
