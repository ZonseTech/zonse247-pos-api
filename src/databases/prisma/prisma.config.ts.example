import 'dotenv/config'
import path from 'path'
import { defineConfig } from 'prisma/config'

const projectRoot = process.cwd()
const prismaDir = path.join(projectRoot, 'node_modules/zonse247-pos-api/src/databases/prisma')

export default defineConfig({
  schema: path.join(prismaDir, 'schema.prisma'),
  migrations: {
    path: path.join(prismaDir, 'migrations'),
    seed: `tsx ${path.join(prismaDir, 'seed.ts')}`
  },
  datasource: {
    url: "file:./local.db",
  },
})