// lib/prisma.ts
// Migration SQLite → PostgreSQL (Neon) via l'adaptateur @prisma/adapter-neon.
// Prisma 7 avec engine "client" nécessite un adapter explicite.
import { PrismaClient } from '../prisma/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const prismaClientSingleton = () => {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL!,
  })
  return new PrismaClient({ adapter })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>
} & typeof global

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

export default prisma