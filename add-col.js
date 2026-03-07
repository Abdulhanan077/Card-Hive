const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_8GjbEIzWw2aS@ep-lucky-violet-ai8ekhwk-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
    await client.connect();
    await client.query('ALTER TABLE "Trade" ADD COLUMN "batchId" TEXT;');
    console.log("Column batchId added successfully to Trade table.");
    await client.end();
}

run().catch(console.error);
