require('dotenv').config({ path: '.env' });
const { confirmTradePayment } = require('./src/app/actions/confirmTrade');

// Mock next-auth
jest.mock('next-auth', () => ({
    getServerSession: jest.fn().mockResolvedValue({
        user: { id: "1" } // rita's ID
    })
}));

// Mock next/cache
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn()
}));

async function runTest() {
    console.log("Starting test...");
    try {
        const tradeId = "GC-2026-000002";
        const result = await confirmTradePayment(tradeId);
        console.log("Result:", result);
    } catch (err) {
        console.error("Caught error:", err);
    }
}

runTest();
