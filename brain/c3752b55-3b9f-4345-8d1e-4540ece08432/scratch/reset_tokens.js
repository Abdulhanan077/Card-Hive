const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetAllTokens() {
  try {
    console.log('--- GLOBAL FCM TOKEN RESET ---');
    
    const result = await prisma.user.updateMany({
      data: { fcmToken: null }
    });

    console.log(`Successfully cleared ${result.count} tokens.`);
    console.log('Next Steps: Open the app on your Android and ask your friend to open Build 8.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAllTokens();
