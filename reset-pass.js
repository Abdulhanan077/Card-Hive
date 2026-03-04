
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetPassword() {
    try {
        const username = 'rita';
        const newPassword = 'password123';
        const hashed = await bcrypt.hash(newPassword, 10);

        const user = await prisma.user.update({
            where: { username },
            data: { password: hashed, emailVerified: new Date() }
        });

        console.log(`Successfully updated password for ${user.username}`);

        // Also ensure there is a PAID trade for this user
        let trade = await prisma.trade.findFirst({
            where: { userId: user.id, status: 'PAID' }
        });

        if (!trade) {
            trade = await prisma.trade.create({
                data: {
                    tradeId: "TRD-" + Math.floor(Math.random() * 100000),
                    userId: user.id,
                    status: 'PAID',
                    cardBrand: 'Amazon',
                    cardType: 'Physical',
                    faceValue: 100,
                    currency: 'USD',
                    payoutMethod: 'MOBILE_MONEY',
                    payoutPhoneNumber: '1234567890'
                }
            });
            console.log(`Created new PAID trade ${trade.tradeId} for ${username}`);
        } else {
            console.log(`Found existing PAID trade ${trade.tradeId} for ${username}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

resetPassword();
