const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.POSTGRES_PRISMA_URL,
    });

    try {
        await client.connect();

        // Simulate updating a message
        const updateRes = await client.query(`
        UPDATE "Message" 
        SET content = 'Direct DB Edit Test', "isEdited" = true 
        WHERE id = (SELECT id FROM "Message" LIMIT 1)
        RETURNING *;
    `);

        if (updateRes.rows.length > 0) {
            console.log("✅ Update successful. Message data:", updateRes.rows[0]);
        } else {
            console.log("⚠️ No messages found to edit, but query executed successfully.");
        }

    } catch (err) {
        console.error("❌ Verification error:", err);
    } finally {
        await client.end();
    }
}

main();
