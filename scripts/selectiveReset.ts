/**
 * SELECTIVE RESET SCRIPT
 * 
 * This script will wipe almost all platform data while preserving 
 * the 'dev_admin' and 'hanan' accounts and their related info.
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.POSTGRES_URL_NON_POOLING,
        },
    },
});

async function selectiveReset() {
    console.log("--------------------------------------------------");
    console.log("          CARD HIVE SELECTIVE RESET               ");
    console.log("          (dev_admin & hanan only)                ");
    console.log("--------------------------------------------------");

    // Safety checks
    if (process.env.ALLOW_FACTORY_RESET !== "true") {
        console.error("ERROR: ALLOW_FACTORY_RESET is not set to 'true' in .env");
        console.log("Aborting to prevent accidental data loss.");
        process.exit(1);
    }

    try {
        // 1. Identify IDs for dev_admin and hanan
        const preservedUsers = await prisma.user.findMany({
            where: {
                username: {
                    in: ['dev_admin', 'hanan']
                }
            },
            select: { id: true, username: true }
        });

        const preservedIds = preservedUsers.map(u => u.id);
        const preservedUsernames = preservedUsers.map(u => u.username);

        if (preservedIds.length === 0) {
            console.error("ERROR: Neither 'dev_admin' nor 'hanan' found in database.");
            console.log("Aborting!");
            process.exit(1);
        }

        console.log(`Preserving Users: ${preservedUsernames.join(', ')} (IDs: ${preservedIds.join(', ')})`);
        console.log("Proceeding to wipe all other data...");

        // 2. Delete related data (order matters for constraints)

        // Trades NOT belonging to preserved users
        const tradeCount = await prisma.trade.deleteMany({
            where: {
                userId: {
                    notIn: preservedIds
                }
            }
        });
        console.log(`Deleted ${tradeCount.count} trade records (not belonging to preserved users).`);

        // Messages NOT belonging to preserved users (sender-wise) 
        // Note: messages belonging to deleted trades are already deleted via cascade if set,
        // but it's safer to delete any stray ones.
        const msgCount = await prisma.message.deleteMany({
            where: {
                senderId: {
                    notIn: preservedIds
                }
            }
        });
        console.log(`Deleted ${msgCount.count} message records (not sent by preserved users).`);

        // Reward Redemptions
        const redemptionCount = await prisma.rewardRedemption.deleteMany({
            where: {
                userId: {
                    notIn: preservedIds
                }
            }
        });
        console.log(`Deleted ${redemptionCount.count} reward redemption records.`);

        // Login events
        const loginCount = await prisma.loginEvent.deleteMany({
            where: {
                userId: {
                    not: null, // Only events linked to users
                    notIn: preservedIds
                }
            }
        });
        console.log(`Deleted ${loginCount.count} login event records.`);

        // Clear OTPs and StatusUpdates (all)
        await prisma.registrationOTP.deleteMany({});
        await prisma.passwordResetOTP.deleteMany({});
        await prisma.statusUpdate.deleteMany({});
        console.log("Cleared OTPs and Status Updates.");

        // 3. Delete OTHER Users
        const userCount = await prisma.user.deleteMany({
            where: {
                id: {
                    notIn: preservedIds
                }
            }
        });
        console.log(`Deleted ${userCount.count} other user records.`);

        console.log("\n--------------------------------------------------");
        console.log("SUCCESS: Selective reset complete.");
        console.log(`Remaining accounts: ${preservedUsernames.join(', ')}`);
        console.log("All other trade and user data has been wiped.");
        console.log("--------------------------------------------------");

    } catch (error) {
        console.error("\nFATAL ERROR during selective reset:");
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

selectiveReset();
