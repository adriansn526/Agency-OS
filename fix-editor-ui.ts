import fs from 'fs'

const path = 'apps/web/app/(dashboard)/offers/[id]/edit/page.tsx'
let content = fs.readFileSync(path, 'utf8')

// Update EditableBlockProps
content = content.replace(
`interface EditableBlockProps {
  block: OfferBlock
  isEditing: boolean
  onStartEdit: () => void
  onStopEdit: () => void
  onUpdateData: (data: OfferBlockData) => void
  onUpdateTitle: (title: string) => void
  onDelete?: () => void
}

function EditableBlock({ block, isEditing, onStartEdit, onStopEdit, onUpdateData, onUpdateTitle, onDelete, idx }: EditableBlockProps & { idx?: number }) {`,
`interface EditableBlockProps {
  block: OfferBlock
  isEditing: boolean
  onStartEdit: () => void
  onStopEdit: () => void
  onUpdateData: (data: OfferBlockData) => void
  onUpdateTitle: (title: string) => void
  onDelete?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onInsertBelow?: (type: 'text' | 'features') => void
  isFirst?: boolean
  isLast?: boolean
}

function EditableBlock({ block, isEditing, onStartEdit, onStopEdit, onUpdateData, onUpdateTitle, onDelete, onMoveUp, onMoveDown, onInsertBelow, isFirst, isLast, idx }: EditableBlockProps & { idx?: number }) {`
)

// Add up/down and insert controls to the EditableBlock header
content = content.replace(
`        <div className="flex items-center gap-2">
          {onDelete && (`,
`        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
            {onMoveUp && <button disabled={isFirst} onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-1 hover:bg-muted text-muted-foreground disabled:opacity-30 rounded"><ChevronUp size={12} /></button>}
            {onMoveDown && <button disabled={isLast} onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-1 hover:bg-muted text-muted-foreground disabled:opacity-30 rounded"><ChevronDown size={12} /></button>}
          </div>
          <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
            <span className="text-[9px] uppercase text-muted-foreground font-bold mr-1">Adaugă sub:</span>
            {onInsertBelow && <button onClick={(e) => { e.stopPropagation(); onInsertBelow('text'); }} className="p-1 px-1.5 hover:bg-muted text-foreground text-[10px] font-medium rounded">+ Text</button>}
            {onInsertBelow && <button onClick={(e) => { e.stopPropagation(); onInsertBelow('features'); }} className="p-1 px-1.5 hover:bg-muted text-foreground text-[10px] font-medium rounded">+ Listă</button>}
          </div>
          {onDelete && (`
)

// Update the generalBlocks mapping
const oldMapping = `                      <EditableBlock
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
                      />`

const newMapping = `                      <EditableBlock
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
                        onMoveUp={() => {
                          setGeneralBlocks(prev => {
                            const newArr = [...prev];
                            [newArr[idx - 1], newArr[idx]] = [newArr[idx], newArr[idx - 1]];
                            return newArr;
                          });
                        }}
                        onMoveDown={() => {
                          setGeneralBlocks(prev => {
                            const newArr = [...prev];
                            [newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]];
                            return newArr;
                          });
                        }}
                        onInsertBelow={(type) => {
                          const newId = \`gen-\${Date.now()}\`;
                          const newBlock = type === 'text' 
                            ? { id: newId, type: 'text', title: 'Text Nou', data: { content: '' } }
                            : { id: newId, type: 'features', title: 'Listă Nouă', data: { categories: [{ name: 'Categorie', items: ['Item 1'] }] } };
                          
                          setGeneralBlocks(prev => {
                            const newArr = [...prev];
                            newArr.splice(idx + 1, 0, newBlock as any);
                            return newArr;
                          });
                          setEditingBlockId(newId);
                        }}
                        isFirst={idx === 0}
                        isLast={idx === generalBlocks.length - 1}
                      />`

content = content.replace(oldMapping, newMapping)

fs.writeFileSync(path, content)
