import re

with open("apps/web/app/(dashboard)/suppliers/page.tsx", "r") as f:
    content = f.read()

# Add imports
imports_to_add = """import { GripVertical, Columns, RefreshCw } from "lucide-react"
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Header } from "@tanstack/react-table"
"""

content = content.replace('import { Eye, Plus, Search, Building2 } from "lucide-react"', 
                          'import { Eye, Plus, Search, Building2 } from "lucide-react"\n' + imports_to_add)

# Add DraggableTableHeader component
draggable_header = """
const DraggableTableHeader = ({ header }: { header: Header<APISupplier, unknown> }) => {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: header.column.id,
  })

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: "relative",
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap bg-muted/30"
    >
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab hover:bg-background p-1 rounded-md text-muted-foreground hover:text-foreground">
          <GripVertical size={14} />
        </button>
        {header.isPlaceholder
          ? null
          : flexRender(header.column.columnDef.header, header.getContext())}
      </div>
    </th>
  )
}

const defaultColumnOrder = ["name", "category", "status", "recurrence", "stats", "totalAmount", "createdAt"]
"""

content = content.replace('const statusConfig: Record<string, { label: string; class: string }> = {', 
                          draggable_header + '\nconst statusConfig: Record<string, { label: string; class: string }> = {')


# Add state variables
states_to_add = """
  const [showColMenu, setShowColMenu] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState({})
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnOrder)
  
  useEffect(() => {
    const savedVisibility = localStorage.getItem('agencyos-suppliers-col-visibility')
    const savedOrder = localStorage.getItem('agencyos-suppliers-col-order')
    if (savedVisibility) setColumnVisibility(JSON.parse(savedVisibility))
    if (savedOrder) setColumnOrder(JSON.parse(savedOrder))
  }, [])

  const saveColumnVisibility = (updaterOrValue: any) => {
    setColumnVisibility((old: any) => {
      const newValue = typeof updaterOrValue === 'function' ? updaterOrValue(old) : updaterOrValue
      localStorage.setItem('agencyos-suppliers-col-visibility', JSON.stringify(newValue))
      return newValue
    })
  }

  const resetColumns = () => {
    setColumnVisibility({})
    setColumnOrder(defaultColumnOrder)
    localStorage.removeItem('agencyos-suppliers-col-visibility')
    localStorage.removeItem('agencyos-suppliers-col-order')
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setColumnOrder((order) => {
        const oldIndex = order.indexOf(active.id as string)
        const newIndex = order.indexOf(over.id as string)
        const newOrder = arrayMove(order, oldIndex, newIndex)
        localStorage.setItem('agencyos-suppliers-col-order', JSON.stringify(newOrder))
        return newOrder
      })
    }
  }
"""

content = content.replace('const [loading, setLoading] = useState(true)', 
                          'const [loading, setLoading] = useState(true)\n' + states_to_add)

# Update useReactTable
table_update = """
  const table = useReactTable({
    data: suppliers,
    columns,
    state: {
      columnVisibility,
      columnOrder,
    },
    onColumnVisibilityChange: saveColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
  })
"""

content = re.sub(r'const table = useReactTable\({[^}]*}\)', table_update.strip(), content)


# Add visibility button
btn_to_add = """
          <div className="relative">
            <button
              onClick={() => setShowColMenu(!showColMenu)}
              className="h-9 px-3 bg-background border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2 shadow-sm"
            >
              <Columns size={16} /> Coloane
            </button>
            {showColMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border shadow-lg rounded-xl p-2 z-50">
                <div className="flex items-center justify-between px-2 py-1 mb-2 border-b border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Vizibilitate</span>
                  <button onClick={resetColumns} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <RefreshCw size={10} /> Reset
                  </button>
                </div>
                {table.getAllLeafColumns().map(column => {
                  return (
                    <div key={column.id} className="px-2 py-1.5 flex items-center gap-2 text-sm text-foreground hover:bg-muted/50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="rounded border-muted-foreground/30 accent-primary"
                      />
                      <span className="flex-1 select-none" onClick={column.getToggleVisibilityHandler()}>
                        {typeof column.columnDef.header === 'string' ? column.columnDef.header : (column.id === 'totalAmount' ? 'Suma Totală' : column.id)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          <button className="h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm">
"""

content = content.replace('<button className="h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm">', btn_to_add)


# Update thead
new_thead = """
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <DndContext
                      key={headerGroup.id}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                      sensors={sensors}
                    >
                      <tr className="border-b border-border bg-muted/30">
                        <SortableContext
                          items={headerGroup.headers.map(h => h.column.id)}
                          strategy={horizontalListSortingStrategy}
                        >
                          {headerGroup.headers.map((header) => (
                            <DraggableTableHeader key={header.id} header={header} />
                          ))}
                        </SortableContext>
                      </tr>
                    </DndContext>
                  ))}
                </thead>
"""

content = re.sub(r'<thead>.*?</thead>', new_thead.strip(), content, flags=re.DOTALL)


with open("apps/web/app/(dashboard)/suppliers/page.tsx", "w") as f:
    f.write(content)

