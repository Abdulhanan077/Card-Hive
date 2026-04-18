import { PrismaClient } from '@prisma/client'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

const prismaClientSingleton = () => {
  const dbUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
  // Increase pool size slightly for peak traffic but keep it within Neon limits
  const pool = new Pool({ 
    connectionString: dbUrl,
    max: 10,       // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
  })
  const adapter = new PrismaNeon(pool)

  return new PrismaClient({ 
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof prismaClientSingleton> | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

