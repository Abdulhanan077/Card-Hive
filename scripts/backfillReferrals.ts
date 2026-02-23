import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { referralCode: null }
    });

    console.log(`Found ${users.length} users needing referral codes.`);

    for (const user of users) {
        let referralCode = user.username.substring(0, 4).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

        let collision = await prisma.user.findUnique({ where: { referralCode } });
        while (collision) {
            referralCode = user.username.substring(0, 4).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
            collision = await prisma.user.findUnique({ where: { referralCode } });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { referralCode }
        });
        console.log(`Updated user ${user.username} with code ${referralCode}`);
    }

    console.log("Backfill complete.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
