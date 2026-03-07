
const { Client } = require('pg');
require('dotenv').config();

async function fixDb() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log("Connected to database successfully.");

        // Check if batchId exists
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='Trade' AND column_name='batchId'
        `);

        if (res.rows.length === 0) {
            console.log("Column batchId missing. Adding it...");
            await client.query('ALTER TABLE "Trade" ADD COLUMN "batchId" TEXT');
            console.log("Column batchId added successfully.");
        } else {
            console.log("Column batchId already exists.");
        }

    } catch (err) {
        console.error("Error fixing database:", err);
    } finally {
        await client.end();
    }
}

fixDb();
