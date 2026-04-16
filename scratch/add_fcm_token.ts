import { prisma } from "./src/lib/prisma";

async function main() {
    console.log("Attempting to add fcmToken column via raw SQL...");
    try {
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fcmToken" TEXT;
        `);
        console.log("Success! fcmToken column added (or already existed).");
    } catch (error) {
        console.error("Failed to add column:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
