const fs = require('fs');
const file = 'apps/web/lib/seo/page-analyzer.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace 1: analyzeAdvancedContentMetrics
code = code.replace(
  /if \(targetKeyword\) {\s*const kwLower = targetKeyword.toLowerCase\(\)\s*\/\/ First 100 words[\s\S]*?updatedScore -= 10\s*}\s*}/g,
  `if (targetKeywords && targetKeywords.length > 0) {
    targetKeywords.forEach(targetKeyword => {
      const kwLower = targetKeyword.toLowerCase()
      
      // First 100 words
      const first100Words = text.split(/\\s+/).slice(0, 100).join(' ').toLowerCase()
      if (!first100Words.includes(kwLower)) {
        issues.push({ severity: 'warning', category: 'content', message: \`Cuvântul cheie "\${targetKeyword}" nu apare în introducere\`, fix: 'Adaugă cuvântul cheie în primele 100 de cuvinte' })
        updatedScore -= 2
      }

      // Subheadings
      const inH2H3 = $('h2, h3').toArray().some(el => $(el).text().toLowerCase().includes(kwLower))
      if (!inH2H3) {
        issues.push({ severity: 'warning', category: 'content', message: \`Cuvântul cheie "\${targetKeyword}" nu apare în niciun H2 sau H3\`, fix: 'Adaugă cuvântul cheie în cel puțin un subtitlu' })
        updatedScore -= 2
      }

      // Keyword Density exact
      const exactMatches = (text.toLowerCase().match(new RegExp(kwLower.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&'), 'g')) || []).length
      const exactDensity = (exactMatches / (words || 1)) * 100
      
      if (exactDensity < 0.3 && exactDensity > 0) {
        issues.push({ severity: 'info', category: 'content', message: \`Densitate prea mică pentru cuvântul cheie "\${targetKeyword}" (\${exactDensity.toFixed(2)}%)\`, fix: 'Repetă cuvântul cheie de câteva ori în mod natural (recomandat 0.5% - 2%)' })
      } else if (exactDensity > 3.0) {
        issues.push({ severity: 'warning', category: 'content', message: \`Keyword Stuffing: Densitate prea mare pentru "\${targetKeyword}" (\${exactDensity.toFixed(2)}%)\`, fix: 'Redu numărul de apariții ale cuvântului cheie (peste 3% poate fi penalizat)' })
        updatedScore -= 5
      }
    });
  }`
);

// Replace 2: analyzePage keyword usage
code = code.replace(
  /if \(targetKeyword\) {\s*const kwLower = targetKeyword.toLowerCase\(\)\s*const inTitle = title.toLowerCase\(\).includes\(kwLower\)[\s\S]*?else contentScore \+= 10\s*}/g,
  `if (targetKeywords && targetKeywords.length > 0) {
    const kwsLower = targetKeywords.map(k => k.toLowerCase())
    const inTitle = kwsLower.some(kw => title.toLowerCase().includes(kw))
    const inMeta = kwsLower.some(kw => metaDescription.toLowerCase().includes(kw))
    const inH1 = kwsLower.some(kw => h1Text.toLowerCase().includes(kw))
    
    if (!inTitle) issues.push({ severity: 'warning', category: 'meta', message: \`Niciun keyword principal nu apare în titlu\`, fix: 'Include cel puțin un keyword principal în tag-ul <title>' })
    else contentScore += 10
    if (!inMeta) issues.push({ severity: 'info', category: 'meta', message: \`Niciun keyword principal nu apare în meta description\`, fix: 'Include keyword-ul în meta description' })
    else contentScore += 5
    if (!inH1) issues.push({ severity: 'warning', category: 'content', message: \`Niciun keyword principal nu apare în H1\`, fix: 'Include keyword-ul principal în H1' })
    else contentScore += 10
  }`
);

fs.writeFileSync(file, code);
