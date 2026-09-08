import { MongoClient } from 'mongodb';

const fs = require('fs');

function normalizePhone(phone) {
    if (!phone) return { type: 'invalid', normalized: '' };
    let p = phone.replace(/[\s\-\(\)\.]/g, '');
    if (p.startsWith('+40')) p = '0' + p.substring(3);
    else if (p.startsWith('0040')) p = '0' + p.substring(4);
    if (/^07\d{8}$/.test(p)) return { type: 'mobile', normalized: p };
    if (/^0[23]\d{8}$/.test(p)) return { type: 'landline', normalized: p };
    return { type: 'invalid', normalized: p };
}

function normalizeCity(city) {
    if (!city) return 'N/A';
    return city.trim().toLowerCase().replace(/bucuresti/i, 'bucurești').replace(/bucureşti/i, 'bucurești');
}

function parseReviews(reviews) {
    if (!reviews) return 0;
    let r = reviews.toString().toLowerCase().replace(/[^0-9k\.]/g, '');
    if (r.includes('k')) return parseFloat(r.replace('k', '')) * 1000;
    return parseInt(r, 10) || 0;
}

function isInvalidEmail(email) {
    if (!email) return true;
    const e = email.toLowerCase();
    const badPatterns = ['noreply', 'no-reply', 'example', 'test@', 'n/a', '-', 'null'];
    if (badPatterns.some(p => e.includes(p))) return true;
    if (e.includes('bolt.eu') || e.includes('glovo.com')) return true;
    return false;
}

const CHAINS = ['mcdonald', 'kfc', 'burger king', 'taco bell', 'spartan', 'dristor', 'sushi master', '5 to go', "ted's coffee", 'paul', 'la placinte', 'city grill', 'trattoria buongiorno', 'socului', 'mesopotamia', 'pizza hut', 'subway', 'starbucks'];

async function run() {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    const db = client.db('fudly');
    const leads = await db.collection('leads').find().toArray();
    await client.close();

    const report = {
        total: leads.length,
        statusNew: 0,
        validPhoneMobile: 0,
        validPhoneLandline: 0,
        validEmail: 0,
        invalidEmailCount: 0,
        parsableReviews: 0,
        unparsableReviews: 0,
        cityCounts: {},
        enrichmentCoverage: {},
        duplicatesCount: 0,
        excludedCount: 0,
        excludeReasons: {},
        segmentsCounts: {},
        actionBandsCounts: { HOT: 0, WARM: 0, COLD: 0, REZERVA_GEO: 0 },
        scoreBands: {},
        queue: [],
        anomalies: []
    };

    const byBaseName = {};
    const byPhone = {};
    const eligibles = [];
    const toRemove = new Set();
    let websiteCount = 0;

    // Pasul 1 & 2: Audit si Filtrare
    leads.forEach(l => {
        if (l.status === 'NEW') report.statusNew++;
        if (l.website) websiteCount++;
        
        const phone = normalizePhone(l.phone || (l.contact && l.contact.phone));
        if (phone.type === 'mobile') report.validPhoneMobile++;
        if (phone.type === 'landline') report.validPhoneLandline++;
        
        const email = l.email || (l.contact && l.contact.email);
        if (!isInvalidEmail(email)) report.validEmail++;
        else report.invalidEmailCount++;

        const revs = parseReviews(l.boltReviewsCount);
        if (revs > 0) report.parsableReviews++;
        else if (l.boltReviewsCount) report.unparsableReviews++;

        const city = normalizeCity(l.city);
        report.cityCounts[city] = (report.cityCounts[city] || 0) + 1;

        const enr = l.enrichmentStatus || 'UNKNOWN';
        report.enrichmentCoverage[enr] = (report.enrichmentCoverage[enr] || 0) + 1;

        l._normPhone = phone.normalized;
        l._cui = l.companyDetails?.cui || '';
        
        // Excluderi
        let excludeReason = null;
        if (phone.type === 'invalid') excludeReason = 'No valid phone';
        else if (l.status === 'CONVERTED' || l.status === 'REJECTED') excludeReason = 'Status is ' + l.status;
        else if (l.enrichmentStatus === 'FAILED' && !l._cui) excludeReason = 'Failed enrichment + no CUI';
        else {
            const nameL = (l.name || '').toLowerCase();
            if (CHAINS.some(c => nameL.includes(c))) excludeReason = 'National/International Chain';
        }

        if (excludeReason) {
            report.excludedCount++;
            report.excludeReasons[excludeReason] = (report.excludeReasons[excludeReason] || 0) + 1;
        } else {
            eligibles.push(l);
            
            // Duplicates detection by phone
            if (l._normPhone) {
                byPhone[l._normPhone] = byPhone[l._normPhone] || [];
                byPhone[l._normPhone].push(l);
            }

            // Extract base name for local chain grouping
            let baseName = (l.name || '').split('-')[0].split('(')[0].trim().toLowerCase();
            baseName = baseName.replace(/restaurant|pizzeria|shaormeria|delivery/gi, '').trim();
            if (baseName.length > 3) {
                byBaseName[baseName] = byBaseName[baseName] || [];
                byBaseName[baseName].push(l);
            }
        }
    });

    if (websiteCount / leads.length < 0.15) {
        report.anomalies.push(`Website is severely underpopulated (${(websiteCount/leads.length*100).toFixed(1)}%). Do not rely on it for scoring.`);
    }

    eligibles.forEach(l => {
        if (toRemove.has(l._id)) return;
        
        // Detect exact duplicates by phone + address
        if (l._normPhone && byPhone[l._normPhone].length > 1) {
            byPhone[l._normPhone].forEach(dup => {
                if (dup._id !== l._id && dup.address === l.address) {
                    toRemove.add(dup._id);
                    report.duplicatesCount++;
                }
            });
        }
    });

    const finalEligibles = eligibles.filter(l => !toRemove.has(l._id));
    
    // Pasul 3: Scorare
    finalEligibles.forEach(l => {
        let baseName = (l.name || '').split('-')[0].split('(')[0].trim().toLowerCase();
        baseName = baseName.replace(/restaurant|pizzeria|shaormeria|delivery/gi, '').trim();
        // 2-6 locații pt lanț local
        l.isLocalChain = baseName.length > 3 && byBaseName[baseName].length >= 2 && byBaseName[baseName].length <= 6;
        
        let score = 0;
        
        // 1. Volum
        const revs = parseReviews(l.boltReviewsCount);
        if (revs >= 400) score += 35;
        else if (revs >= 150) score += 22;
        else if (revs >= 50) score += 10;
        
        // 2. Buget
        if (l.isSponsored) score += 20;

        // 3. Bon Mediu (Estimat din categorie/nume)
        const nameL = (l.name || '').toLowerCase();
        const tagsL = (l.deliveryTags || []).map(t => t.toLowerCase()).join(' ');
        const combined = nameL + ' ' + tagsL;
        
        let estimatedBon = 0;
        if (/(sushi|asiatic|trattoria|premium|steak|fine dining)/i.test(combined)) {
            score += 15; estimatedBon = 80;
        } else if (/(pizza|burger|romaneasca|românească|sanatoasa|sănătoasă|healthy)/i.test(combined)) {
            score += 10; estimatedBon = 50;
        } else if (/(fast food|fast-food|kebab)/i.test(combined)) {
            score += 5; estimatedBon = 35;
        } else if (/(shaorma|meniul zilei|cofetarie|patiserie|desert)/i.test(combined)) {
            score += 0; estimatedBon = 25;
        }
        l.avgOrderValueEst = estimatedBon;

        // 4. Calitate
        const rating = l.boltRating || 0;
        if (rating > 0) {
            if (rating < 4.0) score -= 20;
            else if (rating < 4.2) score -= 10;
            else if (rating >= 4.7) score += 15;
            else if (rating >= 4.5) score += 10;
        }

        // 5. Trafic propriu
        if (l.website || l.social) score += 10;

        // 6. Acces decident
        if (l.contactPerson || (l.contact && l.contact.personName)) score += 5;

        // Multiplicator
        if (l.isLocalChain) score = Math.round(score * 1.3);
        
        l.preQualScore = Math.max(0, Math.min(100, score));

        // Pasul 4: Segmentare
        const isFastFood = /(pizza|burger|fast food|fast-food|kebab)/i.test(combined);
        const isPremium = /(sushi|asiatic|trattoria|premium|steak)/i.test(combined);
        const isSmallTicket = /(shaorma|meniul zilei|fast-food)/i.test(combined) && estimatedBon < 30;

        if (l.isLocalChain) l.segment = 'S2_LANT_LOCAL';
        else if (isFastFood && revs >= 150 && estimatedBon >= 45) l.segment = 'S1_VOLUM_PROPRIU';
        else if (isPremium && estimatedBon > 70) l.segment = 'S3_BON_MARE';
        else if (rating >= 4.5 && revs > 0 && revs < 150) l.segment = 'S4_SALA';
        else if (isSmallTicket) l.segment = 'S5_BON_MIC';
        else if (revs < 50) l.segment = 'S6_VOLUM_MIC';
        else l.segment = 'NECLASIFICAT';

        report.segmentsCounts[l.segment] = (report.segmentsCounts[l.segment] || 0) + 1;

        // Histogram bands
        const b = Math.floor(l.preQualScore / 10) * 10;
        const bandKey = b + '-' + (b+9);
        report.scoreBands[bandKey] = (report.scoreBands[bandKey] || 0) + 1;

        // Pasul 5 & 6: Action Bands & Geografie
        const normCity = normalizeCity(l.city);
        if (normCity !== 'bucurești') {
            l.actionBand = 'REZERVA_GEO';
        } else {
            if (l.preQualScore >= 60 && (l.segment === 'S1_VOLUM_PROPRIU' || l.segment === 'S2_LANT_LOCAL')) l.actionBand = 'HOT';
            else if (l.preQualScore >= 35 && l.preQualScore <= 59) l.actionBand = 'WARM';
            else l.actionBand = 'COLD';
        }
        report.actionBandsCounts[l.actionBand]++;
    });

    const activeCityCount = finalEligibles.filter(l => l.actionBand !== 'REZERVA_GEO').length;
    let hotPercentage = (report.actionBandsCounts['HOT'] / (activeCityCount || 1)) * 100;
    
    // Calibrare banda HOT (sub 20%)
    if (hotPercentage > 20) {
        report.anomalies.push(`HOT band was ${hotPercentage.toFixed(1)}%. Recalibrating HOT threshold from 60 to 70...`);
        report.actionBandsCounts = { HOT: 0, WARM: 0, COLD: 0, REZERVA_GEO: report.actionBandsCounts.REZERVA_GEO };
        finalEligibles.filter(l => l.actionBand !== 'REZERVA_GEO').forEach(l => {
            if (l.preQualScore >= 70 && (l.segment === 'S1_VOLUM_PROPRIU' || l.segment === 'S2_LANT_LOCAL')) l.actionBand = 'HOT';
            else if (l.preQualScore >= 45 && l.preQualScore <= 69) l.actionBand = 'WARM';
            else l.actionBand = 'COLD';
            report.actionBandsCounts[l.actionBand]++;
        });
    }

    report.queue = finalEligibles
        .filter(l => l.actionBand === 'HOT')
        .sort((a, b) => b.preQualScore - a.preQualScore)
        .slice(0, 100)
        .map(q => ({
            nume: q.name,
            telefon: q._normPhone,
            segment: q.segment,
            scor: q.preQualScore,
            recenzii: q.boltReviewsCount,
            rating: q.boltRating,
            sponsorizat: q.isSponsored,
            deschidere: `Am observat că aveți un volum excelent pe platformă (${q.boltReviewsCount} recenzii) și un brand local puternic, deci cel mai probabil pierdeți zilnic minim 100 RON doar din comisioanele la livrare.`
        }));

    fs.writeFileSync('/tmp/fudly-report.json', JSON.stringify(report, null, 2));
}

run().catch(console.error);
