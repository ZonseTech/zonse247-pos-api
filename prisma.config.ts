import 'dotenv/config'
import path from 'path'
import { defineConfig, env } from 'prisma/config'

const projectRoot = process.cwd()
const prismaDir = path.join(projectRoot, 'src/databases/prisma')

export default defineConfig({
  schema: path.join(prismaDir, 'schema.prisma'),
  migrations: {
    path: path.join(prismaDir, 'migrations'),
    seed: `tsx ${path.join(prismaDir, 'seed.ts')}`
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})