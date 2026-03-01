const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdmin() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL_UNPOOLED,
    });

    const username = process.env.FACTORY_RESET_ADMIN_USERNAME || 'admin';
    const email = process.env.FACTORY_RESET_ADMIN_EMAIL || 'admin@cardhive.com';
    const password = process.env.FACTORY_RESET_ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await client.connect();
        console.log('Connected to database.');

        // Check if user already exists
        const checkRes = await client.query('SELECT id FROM "User" WHERE email = $1 OR username = $2', [email, username]);
        if (checkRes.rows.length > 0) {
            console.log('User with this email or username already exists. Updating to ADMIN.');
            await client.query('UPDATE "User" SET role = \'ADMIN\', password = $1 WHERE id = $2', [hashedPassword, checkRes.rows[0].id]);
        } else {
            console.log('Creating new ADMIN user...');
            await client.query(
                'INSERT INTO "User" (username, email, password, role, "phoneNumber", status, "emailNotificationsEnabled", "rewardBalance", "referralCode", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())',
                [username, email, hashedPassword, 'ADMIN', '0000000000', 'ACTIVE', true, 0, 'ADMIN123']
            );
        }
        console.log(`ADMIN user ${username} created/updated successfully with password: ${password}`);
    } catch (err) {
        console.error('Error creating admin:', err.stack);
    } finally {
        await client.end();
    }
}

createAdmin();
