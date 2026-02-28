/**
 * FACTORY RESET SCRIPT
 * 
 * IMPORTANT: This script is for one-time cleaning of the database before final delivery.
 * It will wipe ALL user-related data, trades, messages, etc.
 * 
 * SHOULD NOT be run in production after handover to the client.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function factoryReset() {
    console.log("--------------------------------------------------");
    console.log("            CARD HIVE FACTORY RESET               ");
    console.log("--------------------------------------------------");

    // Safety checks
    if (process.env.ALLOW_FACTORY_RESET !== "true") {
        console.error("ERROR: ALLOW_FACTORY_RESET is not set to 'true' in .env");
        console.log("Aborting to prevent accidental data loss.");
        process.exit(1);
    }

    console.log("WARNING: This will delete ALL users, trades, and messages!");
    console.log("Proceeding in 5 seconds... (Press Ctrl+C to abort)");

    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
        console.log("\nStarting data wipe...");

        // 1. Delete dependent data first
        const messageCount = await prisma.message.deleteMany({});
        console.log(`Deleted ${messageCount.count} message records.`);

        const tradeCount = await prisma.trade.deleteMany({});
        console.log(`Deleted ${tradeCount.count} trade records.`);

        const redemptionCount = await prisma.rewardRedemption.deleteMany({});
        console.log(`Deleted ${redemptionCount.count} reward redemption records.`);

        const loginCount = await prisma.loginEvent.deleteMany({});
        console.log(`Deleted ${loginCount.count} login event records.`);

        const regOtpCount = await prisma.registrationOTP.deleteMany({});
        console.log(`Deleted ${regOtpCount.count} registration OTP records.`);

        const resetOtpCount = await prisma.passwordResetOTP.deleteMany({});
        console.log(`Deleted ${resetOtpCount.count} password reset OTP records.`);

        // 2. Delete Users (cascades to Accounts and Sessions in schema)
        const userCount = await prisma.user.deleteMany({});
        console.log(`Deleted ${userCount.count} user records.`);

        // 3. Keep Settings and CardRates as requested (static config)
        console.log("Preserving Settings and CardRates.");

        // 4. Create fresh admin user
        const adminUsername = process.env.FACTORY_RESET_ADMIN_USERNAME || "admin";
        const adminEmail = process.env.FACTORY_RESET_ADMIN_EMAIL || "admin@cardhive.com";
        const adminPassword = process.env.FACTORY_RESET_ADMIN_PASSWORD || "Admin123!";

        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        await prisma.user.create({
            data: {
                username: adminUsername,
                email: adminEmail,
                password: hashedPassword,
                role: "ADMIN",
                phoneNumber: "0000000000", // Default
                emailVerified: new Date(),
                status: "ACTIVE",
            }
        });

        console.log("\n--------------------------------------------------");
        console.log("SUCCESS: Factory reset complete.");
        console.log(`Created new Admin: ${adminUsername} (${adminEmail})`);
        console.log("--------------------------------------------------");

    } catch (error) {
        console.error("\nFATAL ERROR during factory reset:");
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

factoryReset();
