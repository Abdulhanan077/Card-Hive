const { Client } = require('pg');
require('dotenv').config();

async function checkMaxConnections() {
    // Connect directly to find pure limits
    const client = new Client({
        connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
    });
    try {
        await client.connect();
        const res = await client.query('SHOW max_connections;');
        console.log("pg_settings max_connections:", res.rows[0].max_connections);
    } catch (err) {
        console.error("PG ERROR:", err);
    } finally {
        await client.end();
    }
}

checkMaxConnections();
