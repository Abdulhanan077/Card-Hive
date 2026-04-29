const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanStaleTokens() {
  try {
    console.log('--- Cleaning Stale FCM Tokens ---');
    
    // Find all users with a token
    const users = await prisma.user.findMany({
      where: { fcmToken: { not: null } },
      select: { id: true, username: true, fcmToken: true }
    });

    console.log(`Found ${users.length} total tokens in database.`);

    // To be safe, we'll only clear tokens that look "suspiciously old" 
    // or we'll just show you exactly who they belong to.
    for (const user of users) {
      console.log(`User: ${user.username.padEnd(15)} Token: ${user.fcmToken.substring(0, 20)}...`);
    }

    // IMPORTANT: Tell the user how to clear them manually if they want, 
    // or just clear the ones that failed.
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanStaleTokens();
