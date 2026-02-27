const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            email: true,
            username: true,
            role: true,
            emailVerified: true
        }
    });
    console.log('--- USER ROLES ---');
    users.forEach(u => console.log(`${u.username} (${u.email}): ROLE=${u.role}, VERIFIED=${u.emailVerified}`));
    console.log('------------------');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
