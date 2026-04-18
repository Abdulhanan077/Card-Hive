const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const username = 'app_reviewer';
  const password = 'ReviewerPass123!';
  const email = 'reviewer@cardhive.app';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('Creating App Store Reviewer test account...');

  try {
    // 1. Create or Update User
    const user = await prisma.user.upsert({
      where: { username },
      update: {
        password: hashedPassword,
        status: 'ACTIVE',
        deletedAt: null,
        emailVerified: new Date(),
      },
      create: {
        username,
        email,
        password: hashedPassword,
        phoneNumber: '0240000000',
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: new Date(),
      },
    });

    console.log(`User created/updated: ${user.username} (ID: ${user.id})`);

    // 2. Add some mock trade history if they don't have any
    const tradeCount = await prisma.trade.count({ where: { userId: user.id } });
    if (tradeCount === 0) {
      console.log('Adding mock trade history for reviewer...');
      await prisma.trade.createMany({
        data: [
          {
            tradeId: 'GC-2026-TEST-01',
            userId: user.id,
            cardBrand: 'Amazon',
            cardCountry: 'US',
            cardType: 'Physical',
            faceValue: 100,
            currency: 'USD',
            calculatedPayout: 1150.50,
            cardCode: 'TEST-AMZN-CODE-123',
            cardCodeHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // SHA-256 for 'password'
            status: 'COMPLETED',
            payoutNetwork: 'MTN',
            payoutPhoneNumber: '0240000000',
            createdAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
          },
          {
            tradeId: 'GC-2026-TEST-02',
            userId: user.id,
            cardBrand: 'Apple/iTunes',
            cardCountry: 'UK',
            cardType: 'E-code',
            faceValue: 50,
            currency: 'GBP',
            calculatedPayout: 750.25,
            cardCode: 'TEST-APPLE-CODE-456',
            cardCodeHash: 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f', // another test hash
            status: 'PAID',
            payoutNetwork: 'Telecel',
            payoutPhoneNumber: '0240000000',
            createdAt: new Date(Date.now() - 3600000 * 5), // 5 hours ago
          }
        ]
      });
      console.log('Mock trades added.');
    }

    console.log('\n--- SUCCESS ---');
    console.log(`Reviewer Account: ${username}`);
    console.log(`Reviewer Password: ${password}`);
    console.log('\nTo run this script, use: npx ts-node scripts/create_tester.ts');

  } catch (error) {
    console.error('Error creating tester account:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
