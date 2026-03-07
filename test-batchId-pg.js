const { Client } = require('pg');
const fs = require('fs');
const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_8GjbEIzWw2aS@ep-lucky-violet-ai8ekhwk-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
    await client.connect();
    const res = await client.query('SELECT "id", "tradeId", "fullName", "cardBrand", "createdAt" FROM "Trade" ORDER BY "id" DESC LIMIT 10;');
    fs.writeFileSync('db-trades.json', JSON.stringify(res.rows, null, 2));
    console.log("Wrote latest trades to db-trades.json");
    await client.end();
}

run().catch(console.error);
