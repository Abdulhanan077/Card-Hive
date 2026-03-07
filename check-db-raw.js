
const { Client } = require('pg');
require('dotenv').config();

async function checkCols() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
    });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Message';
        `);
        console.log("COLUMNS IN MESSAGE TABLE:");
        console.log(JSON.stringify(res.rows, null, 2));

        const lastMsg = await client.query(`SELECT * FROM "Message" ORDER BY "createdAt" DESC LIMIT 1;`);
        console.log("LAST MESSAGE DATA:");
        console.log(JSON.stringify(lastMsg.rows, null, 2));

    } catch (err) {
        console.error("PG ERROR:", err);
    } finally {
        await client.end();
    }
}
checkCols();
