require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
    try {
        console.log("Checking if admin exists...");
        const existing = await prisma.user.findFirst();
        if (existing) {
            console.log("Users already exist in the database. Aborting.");
            return;
        }

        const hashedPassword = await bcrypt.hash("newpassword", 10);

        await prisma.user.create({
            data: {
                username: "admin",
                email: "admin@cardhive.com",
                password: hashedPassword,
                role: "ADMIN",
                phoneNumber: "0000000000",
                emailVerified: new Date(),
                status: "ACTIVE",
            }
        });

        console.log("SUCCESS: Created admin user (admin / newpassword)");
    } catch (error) {
        console.error("Error creating admin:", error);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
