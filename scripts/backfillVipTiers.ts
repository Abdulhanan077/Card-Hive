import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting VIP Tier Backfill...");

    // Get all users
    const users = await prisma.user.findMany({
        where: { role: "USER" },
        select: { id: true, username: true }
    });

    console.log(`Found ${users.length} users. Calculating historical trades...`);

    let updatedCount = 0;

    for (const user of users) {
        const paidTradesCount = await prisma.trade.count({
            where: { userId: user.id, status: "PAID" }
        });

        await prisma.user.update({
            where: { id: user.id },
            data: { completedTradesCount: paidTradesCount }
        });

        console.log(`Updated @${user.username}: ${paidTradesCount} completed trades.`);
        updatedCount++;
    }

    console.log(`\nBackfill successful! Updated ${updatedCount} users.`);
}

main()
    .catch((e) => {
        console.error("Backfill failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
