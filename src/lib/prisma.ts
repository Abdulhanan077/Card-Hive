import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof prismaClientSingleton> | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  if (!globalForPrisma.prisma) {
    console.log("🚀 PRISMA_SINGLETON_ACTIVE_V3");
  }
  globalForPrisma.prisma = prisma
}
