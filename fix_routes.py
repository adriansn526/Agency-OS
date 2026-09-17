import re
import glob

def fix_route(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Update function signatures to handle Promise
    content = re.sub(
        r'export async function (PATCH|DELETE|GET|PUT)\(request: (NextRequest|Request), { params }: { params: { id: string } }\) \{',
        r'export async function \1(request: \2, props: { params: Promise<{ id: string }> }) {\n  const params = await props.params;\n  const id = params.id;',
        content
    )
    
    # Replace params.id with id
    content = content.replace('params.id', 'id')
    
    with open(filepath, 'w') as f:
        f.write(content)

fix_route('apps/web/app/api/accounting/expense-categories/[id]/route.ts')
fix_route('apps/web/app/api/accounting/rules/[id]/route.ts')
