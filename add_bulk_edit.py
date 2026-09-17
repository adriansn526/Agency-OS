import re

filepath = "apps/web/app/(dashboard)/suppliers/page.tsx"

with open(filepath, 'r') as f:
    content = f.read()

# Add toast to imports if not there
if "import { toast }" not in content:
    content = content.replace('import { Eye, Plus, Search, Building2 } from "lucide-react"', 'import { Eye, Plus, Search, Building2 } from "lucide-react"\nimport { toast } from "sonner"')

# Add new states
state_addition = """  const [rowSelection, setRowSelection] = useState({})
  const [categories, setCategories] = useState<{name: string}[]>([])
  
  useEffect(() => {
    fetch('/api/accounting/expense-categories?activeOnly=true')
      .then(res => res.json())
      .then(json => {
        if (json.data) setCategories(json.data)
      })
  }, [])

  const handleBulkAssignCategory = async (category: string) => {
    const selectedIds = Object.keys(rowSelection)
    if (!selectedIds.length || !category) return
    
    try {
      const res = await fetch('/api/suppliers/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierIds: selectedIds, data: { category } })
      })
      if (!res.ok) throw new Error('Failed to bulk assign')
      toast.success(`${selectedIds.length} furnizori actualizați cu succes!`)
      setRowSelection({})
      loadSuppliers()
    } catch (err) {
      toast.error('Eroare la actualizarea furnizorilor')
    }
  }
"""

content = content.replace("const [suppliers, setSuppliers] = useState<APISupplier[]>([])", state_addition + "\n  const [suppliers, setSuppliers] = useState<APISupplier[]>([])")

# Add the checkbox column to `columns`
checkbox_col = """      {
        id: "select",
        header: ({ table }) => (
          <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
              checked={table.getIsAllPageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
            />
          </div>
        ),
      },
"""

content = content.replace("() => [\n      {", "() => [\n" + checkbox_col + "      {")
content = content.replace('const defaultColumnOrder = ["name",', 'const defaultColumnOrder = ["select", "name",')

# Add `getRowId` and selection state to `useReactTable`
table_config = """  const table = useReactTable({
    data: suppliers,
    columns,
    getRowId: row => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    state: {
      columnVisibility,
      columnOrder,
      rowSelection,
    },"""

content = content.replace("""  const table = useReactTable({
    data: suppliers,
    columns,
    state: {
      columnVisibility,
      columnOrder,
    },""", table_config)

# Add the action bar
action_bar = """
      {Object.keys(rowSelection).length > 0 && (
        <div className="bg-primary/5 border-b border-primary/20 px-6 py-3 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="text-sm font-medium text-primary">
            {Object.keys(rowSelection).length} furnizori selectați
          </div>
          <div className="flex items-center gap-3">
            <select 
              className="h-8 rounded-lg bg-background border border-border text-sm px-2 outline-none focus:ring-1 focus:ring-primary min-w-[150px]"
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkAssignCategory(e.target.value)
                  e.target.value = ""
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>Atribuie Categorie...</option>
              {categories.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            <button 
              onClick={() => setRowSelection({})} 
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Anulează
            </button>
          </div>
        </div>
      )}
"""

content = content.replace("{/* Table Content */}", action_bar + "\n      {/* Table Content */}")

# Prevent dragging for 'select' column
drag_header_replace = """const DraggableTableHeader = ({ header }: { header: Header<APISupplier, unknown> }) => {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: header.column.id,
  })

  if (header.column.id === 'select') {
    return (
      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap bg-muted/30 w-10">
        {flexRender(header.column.columnDef.header, header.getContext())}
      </th>
    )
  }
"""

content = content.replace("""const DraggableTableHeader = ({ header }: { header: Header<APISupplier, unknown> }) => {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: header.column.id,
  })
""", drag_header_replace)

with open(filepath, 'w') as f:
    f.write(content)
