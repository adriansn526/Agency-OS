import re

with open("packages/db/prisma/schema.prisma", "r") as f:
    content = f.read()

content = content.replace("model DeductibilityRule {\n  id                       String    @id\n", "model DeductibilityRule {\n  id                       String    @id @default(cuid())\n")

with open("packages/db/prisma/schema.prisma", "w") as f:
    f.write(content)
