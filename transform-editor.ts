import fs from 'fs'

const path = 'apps/web/app/(dashboard)/offers/[id]/edit/page.tsx'
let content = fs.readFileSync(path, 'utf8')

// 1. Add imports at the top (after other imports)
const importTarget = 'import { BlockRenderer } from "@/components/block-renderer"'
const imports = `import { Archivo, Source_Serif_4 } from "next/font/google"\nimport "../../../o/[token]/oferta.css"\n\nconst archivo = Archivo({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-archivo" })\nconst sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-source-serif" })`
content = content.replace(importTarget, `${importTarget}\n${imports}`)

// 2. Replace RIGHT: Live Preview section
const rightPreviewStart = `{/* ─── RIGHT: Live Preview ─── */}`
const rightPreviewEnd = `{/* ─── MODALS ─── */}`

const rightPreviewContent = `{/* ─── RIGHT: Live Preview ─── */}
        <div className={\`flex-1 overflow-y-auto oferta-theme \${archivo.variable} \${sourceSerif.variable}\`}>
          <div className="wrap py-12">
            <header className="cover">
              <h1>{projectName || entityName || "Proiect Nou"}</h1>
              <p className="lede">Prezentare ofertei direct în șablonul final.</p>
              <p className="addressee">În atenția <b>{entityName || "Client"}</b></p>
            </header>

            <div className="body-grid" style={{ display: 'block', marginTop: '24px' }}>
              <main style={{ maxWidth: '100%' }}>
                {/* General Blocks (Intro, etc) */}
                <div className="mb-8">
                  {generalBlocks.length > 0 && <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6 opacity-50 border-b border-border pb-2">Conținut General</h3>}
                  {generalBlocks.map((block, idx) => (
                    <div key={block.id} className="mb-6 relative group">
                      <EditableBlock
                        block={block}
                        idx={idx}
                        isEditing={editingBlockId === block.id}
                        onStartEdit={() => setEditingBlockId(block.id)}
                        onStopEdit={() => setEditingBlockId(null)}
                        onUpdateData={(data) => setGeneralBlocks(prev => prev.map(b => b.id === block.id ? { ...b, data } : b))}
                        onUpdateTitle={(title) => setGeneralBlocks(prev => prev.map(b => b.id === block.id ? { ...b, title } : b))}
                        onDelete={() => {
                          setGeneralBlocks(prev => prev.filter(b => b.id !== block.id))
                          setEditingBlockId(null)
                        }}
                      />
                    </div>
                  ))}

                  <div className="flex justify-center gap-2 mt-8">
                    <button onClick={() => {
                      const newId = \`gen-\${Date.now()}\`
                      setGeneralBlocks(prev => [...prev, { id: newId, type: 'text', title: 'Text Nou', data: { content: '' } }])
                      setEditingBlockId(newId)
                    }} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/20 hover:bg-muted/50 text-xs font-medium text-foreground rounded-lg border border-border transition-colors border-dashed">
                      <Plus size={12} /> Bloc Text
                    </button>
                    <button onClick={() => {
                      const newId = \`gen-\${Date.now()}\`
                      setGeneralBlocks(prev => [...prev, { id: newId, type: 'features', title: 'Listă Nouă', data: { categories: [{ name: 'Categorie', items: ['Item 1'] }] } }])
                      setEditingBlockId(newId)
                    }} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/20 hover:bg-muted/50 text-xs font-medium text-foreground rounded-lg border border-border transition-colors border-dashed">
                      <Plus size={12} /> Bloc Listă
                    </button>
                  </div>
                </div>

                {/* Modules as packs */}
                {modules.length > 0 && (
                  <section id="s-pachete">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6 opacity-50 border-b border-border pb-2 mt-12">Pachete (Servicii configurate)</h3>
                    <div className="packs">
                      {modules.map((m, mIdx) => {
                        const enabledBlocks = m.blocks.filter(b => m.enabledBlocks.has(b.id))
                        const isRecommended = m.status === 'recommended' || (modules.length > 1 && mIdx === modules.length - 1)
                        
                        return (
                          <div key={m.serviceId} 
                            onClick={() => setActiveModuleIdx(mIdx)}
                            className={\`pack relative cursor-pointer transition-all \${isRecommended ? 'pick' : ''} \${activeModuleIdx === mIdx ? 'ring-2 ring-primary ring-offset-2' : ''}\`}
                          >
                            {isRecommended && <span className="pack-tag">Recomandat</span>}
                            {activeModuleIdx === mIdx && <span className="absolute -top-3 -left-3 px-2 py-0.5 text-[9px] font-bold uppercase bg-primary text-primary-foreground rounded-full shadow-sm z-10">Selectat</span>}
                            
                            <h3>{m.service.name}</h3>
                            <p className="price">{m.price} {currency}</p>
                            <p className="unit">{m.pricingUnit === 'lunar' ? 'pe lună' : m.pricingUnit === 'per_hour' ? 'pe oră' : 'preț fix'}</p>
                            
                            <ul>
                              {enabledBlocks.map((block, bIdx) => (
                                <li key={bIdx} className="group/item relative">
                                  <span>{block.title}</span>
                                  {activeModuleIdx === mIdx && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setEditingBlockId(block.id); }}
                                      className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 p-1 bg-primary/10 text-primary rounded"
                                    >
                                      <Pencil size={10} />
                                    </button>
                                  )}
                                  {/* Editor popup for module block */}
                                  {editingBlockId === block.id && activeModuleIdx === mIdx && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-background border border-border shadow-xl rounded-xl p-3" onClick={e => e.stopPropagation()}>
                                      <div className="flex items-center justify-between mb-2">
                                        <input value={block.title} onChange={e => updateBlockTitle(mIdx, block.id, e.target.value)} className="text-xs font-bold bg-transparent border-b outline-none w-full mr-2" />
                                        <button onClick={() => setEditingBlockId(null)} className="px-2 py-1 bg-primary text-primary-foreground text-[9px] rounded">Done</button>
                                      </div>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )}

              </main>
            </div>
          </div>
        </div>

        `

const startIdx = content.indexOf(rightPreviewStart)
const endIdx = content.indexOf(rightPreviewEnd)

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + rightPreviewContent + content.substring(endIdx)
}

// 3. Update EditableBlock signature to include idx
content = content.replace(
  `function EditableBlock({ block, isEditing, onStartEdit, onStopEdit, onUpdateData, onUpdateTitle, onDelete }: EditableBlockProps) {`,
  `function EditableBlock({ block, isEditing, onStartEdit, onStopEdit, onUpdateData, onUpdateTitle, onDelete, idx }: EditableBlockProps & { idx?: number }) {`
)

// 4. Update EditableBlock read-only view to use <section> and <h2> instead of BlockRenderer
const readOnlyStart = `if (!isEditing) {\n    // Read-only view with edit hover overlay\n    return (\n      <div className="group relative cursor-pointer" onClick={(e) => { e.stopPropagation(); onStartEdit() }}>\n        <BlockRenderer block={block} variant="public" />`
const newReadOnly = `if (!isEditing) {\n    const isFeatures = block.type === "features" || (block.data as any)?.categories\n    return (\n      <div className="group relative cursor-pointer hover:bg-[rgba(18,37,58,0.03)] p-4 -mx-4 rounded-xl transition-all" onClick={(e) => { e.stopPropagation(); onStartEdit() }}>\n        <section className="pointer-events-none mb-0">\n          <h2><i>{idx !== undefined ? idx + 1 : '*'}</i> {block.title}</h2>\n          {isFeatures ? (\n            (block.data as any)?.categories?.map((cat: any, cIdx: number) => (\n              <div key={cIdx}>\n                <h3>{cat.name}</h3>\n                <ul className="list">\n                  {cat.items?.map((item: string, iIdx: number) => (\n                    <li key={iIdx}>{item}</li>\n                  ))}\n                </ul>\n              </div>\n            ))\n          ) : (\n            <div dangerouslySetInnerHTML={{ __html: (block.data as any)?.content || "" }} />\n          )}\n        </section>`

content = content.replace(readOnlyStart, newReadOnly)

fs.writeFileSync(path, content)
