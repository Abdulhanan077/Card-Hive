
import { prisma } from "./src/lib/prisma";

async function checkCols() {
    try {
        const cols = await prisma.$queryRaw`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Message';
        `;
        console.log("COLUMNS IN MESSAGE TABLE:");
        console.log(JSON.stringify(cols, null, 2));
    } catch (err) {
        console.error("FAILED TO CHECK COLUMNS:", err);
    } finally {
        await prisma.$disconnect();
    }
}

checkCols();
