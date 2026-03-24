const { Client } = require('pg');
require('dotenv').config();

async function checkUsers() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
    });
    try {
        await client.connect();
        const userRes = await client.query('SELECT id, "completedTradesCount" FROM "User" WHERE username = \'hanan\'');
        const user = userRes.rows[0];
        const tradeRes = await client.query('SELECT COUNT(*) FROM "Trade" WHERE "userId" = $1', [user.id]);
        
        console.log("USER 'hanan' VERIFICATION:");
        console.log(`Completed Trades Count (Manual): ${user.completedTradesCount}`);
        console.log(`Actual Trades in Table: ${tradeRes.rows[0].count}`);
    } catch (err) {
        console.error("PG ERROR:", err);
    } finally {
        await client.end();
    }
}
checkUsers();
