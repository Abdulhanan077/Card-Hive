const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            email: true,
            username: true
        }
    });
    console.log('--- REGISTERED EMAILS ---');
    users.forEach(u => console.log(`${u.username}: ${u.email}`));
    console.log('-------------------------');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
