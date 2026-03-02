const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const rates = await prisma.$queryRawUnsafe(`SELECT id, "cardBrand", "cardCountry", "cardType", rate, "publicRate", "updatedAt" FROM "CardRate"`);
    console.log(JSON.stringify(rates, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
