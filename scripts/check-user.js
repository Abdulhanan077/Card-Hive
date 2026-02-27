const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'illyr3482@gmail.com' },
        select: {
            email: true,
            username: true,
            role: true,
            emailVerified: true
        }
    });
    console.log('--- USER INFO ---');
    if (user) {
        console.log(`Username: ${user.username}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Verified: ${user.emailVerified}`);
    } else {
        console.log('User not found.');
    }
    console.log('-----------------');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
