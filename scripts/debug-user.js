const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    console.log('--- FETCHING USER illyr3482@gmail.com ---');
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: { equals: 'illyr3482@gmail.com', mode: 'insensitive' } },
                { username: { equals: 'Test3', mode: 'insensitive' } }
            ]
        },
        select: {
            email: true,
            username: true,
            role: true,
            emailVerified: true,
            password: true
        }
    });

    if (user) {
        console.log(`Found User: ${user.username}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Verified: ${user.emailVerified}`);
        console.log(`Password Hash starts with: ${user.password.substring(0, 10)}...`);
    } else {
        console.log('User NOT FOUND.');
    }
    console.log('-----------------------------------------');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
