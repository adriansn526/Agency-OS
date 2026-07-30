import { db } from '@repo/db'
import { saveWPPost } from './apps/web/lib/integrations/wordpress'

async function run() {
  const projectId = 'cmnybgh790001cucc58jgsyrh'
  const project = await db.project.findUnique({ where: { id: projectId } })
  if (!project) throw new Error("Project not found")

  const metadata: any = project.metadata || {}
  const { wpUrl, wpUsername, wpAppPassword } = metadata

  if (!wpUrl) throw new Error("No WP config")

  console.log("Found WP config:", wpUrl, wpUsername)

  const meta = {
    rank_math_focus_keyword: "REACH compliance testing",
    rank_math_description: "ECHA's new REF-16 project targets hazardous chemicals in EU imports. Learn how REACH compliance testing and quality control can protect your supply chain.",
    rank_math_title: "ECHA REF-16 Enforcement: Why You Need REACH Compliance Testing",
    yoast_wpseo_focuskw: "REACH compliance testing",
    yoast_wpseo_metadesc: "ECHA's new REF-16 project targets hazardous chemicals in EU imports. Learn how REACH compliance testing and quality control can protect your supply chain.",
    yoast_wpseo_title: "ECHA REF-16 Enforcement: Why You Need REACH Compliance Testing"
  }

  const { data, error } = await saveWPPost(wpUrl, wpUsername, wpAppPassword, {
    title: "ECHA’s New REF-16 Enforcement Project: What EU Importers & Manufacturers Need to Know",
    content: "<h2>What is the REF-16 Enforcement Project?</h2><p>The Enforcement Forum regularly launches harmonized projects (REACH-EN-FORCE) to ensure that chemical regulations are applied consistently across the European Economic Area.</p><p>The primary target of the newly announced <strong>REF-16 project</strong> is to verify compliance with <strong>Annex XVII of the REACH Regulation</strong>, which explicitly restricts the use of dangerous substances in everyday consumer and industrial products.</p><h3>Key Focus Areas of the Inspections:</h3><ol><li><strong>Imported Goods & Customs Data:</strong> Inspectors are increasingly collaborating with national customs authorities. Shipments entering the EU will be targeted based on risk profiles, meaning overseas manufacturers face a higher risk of random sampling.</li><li><strong>Online Sales & E-Commerce:</strong> Historically, products sold on online marketplaces have shown higher rates of non-compliance. ECHA has confirmed that inspectors will heavily scrutinize digital distribution channels and e-commerce platforms.</li><li><strong>Classification & Labeling (CLP):</strong> Beyond the physical presence of restricted chemicals, inspectors will check if chemical mixtures are packaged and labeled correctly according to CLP regulations.</li><li><strong>Safety Data Sheets (SDS):</strong> Authorities will demand immediate access to accurate, up-to-date Safety Data Sheets to verify that proper risk management measures are documented.</li></ol><h2>The Cost of Non-Compliance</h2><p>National authorities in each EU member state execute these inspections. If a product is found to contain restricted substances above the permitted thresholds (such as excessive levels of Lead, Phthalates, or Cadmium), the consequences are severe:</p><ul><li><strong>Immediate Market Withdrawal:</strong> Products can be banned from sale across the entire EU.</li><li><strong>Customs Seizure:</strong> Imported shipments can be halted at the border, leading to massive logistical costs.</li><li><strong>Brand Reputation Damage:</strong> ECHA and national databases publicly list non-compliant products, damaging consumer trust.</li></ul><h2>How Quality Control Protects Your Supply Chain</h2><p>With ECHA inspectors actively looking for violations, businesses cannot afford to simply take their suppliers word for it. You need verifiable proof of compliance <em>before</em> the goods board a ship.</p><p>Here is how implementing a stringent Quality Control strategy protects your business from REF-16 enforcement actions:</p><h3>1. Pre-Shipment Laboratory Testing</h3><p>Visual inspections are not enough to detect hazardous chemicals. Partnering with a professional QC agency ensures that random product samples are sent to accredited laboratories. These labs test specifically for REACH Annex XVII restricted substances, ensuring total compliance before the goods ever reach European customs.</p><h3>2. Supplier Auditing and Document Verification</h3><p>Are your suppliers actually using the compliant raw materials they promised? A robust Factory Audit evaluates the manufacturer internal quality management systems and verifies their sourcing. Inspectors will cross-check the validity of the factory Material Safety Data Sheets (MSDS) and declarations of conformity.</p><h3>3. Packaging & Labeling Checks</h3><p>Since REF-16 also focuses on CLP (Classification, Labelling, and Packaging), QC inspectors can perform Pre-Shipment Inspections (PSI) to guarantee that all warning labels, hazard pictograms, and packaging materials meet exact EU legal specifications.</p><h2>Conclusion: Act Before the Inspectors Do</h2><p>The ECHA REF-16 enforcement project is a clear warning that the EU is cracking down on chemical safety. Relying on outdated supplier declarations is a massive risk.</p><p>By integrating independent <strong>Quality Control inspections and Lab Testing</strong> into your procurement process, you eliminate the guesswork. You ensure that your products are safe, compliant, and ready to pass any ECHA inspection with flying colors.</p>",
    status: "draft",
    meta
  })

  if (error) {
    console.error("Error saving WP Post:", error)
  } else {
    console.log("Successfully saved post with ID:", data.id)
    
    const wpSeoCache = metadata.wpSeoCache || {}
    wpSeoCache[data.id] = {
      ...(wpSeoCache[data.id] || {}),
      ...meta
    }
    await db.project.update({
      where: { id: projectId },
      data: {
        metadata: {
          ...metadata,
          wpSeoCache
        }
      }
    })
    console.log("Updated local cache.")
  }
}

run().catch(console.error)
