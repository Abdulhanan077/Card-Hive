const { Client } = require('pg');
require('dotenv').config();

async function checkUsers() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL_UNPOOLED,
    });

    try {
        await client.connect();
        console.log('Connected to database.');
        const res = await client.query('SELECT count(*), role FROM "User" GROUP BY role');
        console.log('User counts by role:', res.rows);
    } catch (err) {
        console.error('Connection error:', err.stack);
    } finally {
        await client.end();
    }
}

checkUsers();
