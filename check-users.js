const { Client } = require('pg');
require('dotenv').config();

async function checkUsers() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
    });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT id, username, email, role, status 
            FROM "User";
        `);
        console.log("USERS IN DATABASE:");
        console.table(res.rows);
    } catch (err) {
        console.error("PG ERROR:", err);
    } finally {
        await client.end();
    }
}
checkUsers();
