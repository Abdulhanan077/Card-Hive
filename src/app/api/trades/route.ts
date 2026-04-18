import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToR2 } from "@/lib/upload";
import crypto from "crypto";
import {
    sendTradeSubmittedEmail,
    sendAdminNewTradeEmail
} from "@/lib/email";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();

        // Extract generic payout fields
        const payoutMethod = (formData.get("payoutMethod") as string) || "MOBILE_MONEY";
        const payoutNetwork = (formData.get("payoutNetwork") as string) || "";
        const payoutPhoneNumber = (formData.get("payoutPhoneNumber") as string) || "";
        const payoutAccountName = (formData.get("payoutAccountName") as string) || null;

        // Crypto fields
        const cryptoCoin = (formData.get("cryptoCoin") as string) || null;
        const cryptoNetwork = (formData.get("cryptoNetwork") as string) || null;
        const cryptoExchange = (formData.get("cryptoExchange") as string) || null;
        const cryptoReceiverIdType = (formData.get("cryptoReceiverIdType") as string) || null;
        const cryptoReceiverId = formData.get("cryptoReceiverId") as string;

        const notes = formData.get("notes") as string;

        // Extract cards data
        const cardsJson = formData.get("cards") as string;
        if (!cardsJson) {
            return NextResponse.json({ message: "No cards provided" }, { status: 400 });
        }

        let cards: any[] = [];
        try {
            cards = JSON.parse(cardsJson);
        } catch (e: any) {
            return NextResponse.json({ message: "Invalid cards data" }, { status: 400 });
        }

        if (cards.length === 0) {
            return NextResponse.json({ message: "No cards provided" }, { status: 400 });
        }

        // 1. Batch Duplicate Check Logic
        const cardCodeHashes = cards.map(card => {
            const rawToHash = `${card.cardCode}-${card.serialNumber || ""}`.trim();
            return crypto.createHash("sha256").update(rawToHash).digest("hex");
        });

        const duplicateTrades = await prisma.trade.findMany({
            where: {
                cardCodeHash: { in: cardCodeHashes },
                status: { not: "REJECTED" }
            },
            select: { cardCodeHash: true, cardCode: true, tradeId: true }
        });

        if (duplicateTrades.length > 0) {
            return NextResponse.json(
                { message: `One or more cards (including ${duplicateTrades[0].cardCode}) appear to have already been submitted.` },
                { status: 409 }
            );
        }

        // 2. Batch Fetch Rates
        const brands = Array.from(new Set(cards.map(c => c.cardBrand)));
        const relevantRates = await prisma.cardRate.findMany({
            where: {
                cardBrand: { in: brands }
            }
        });

        // 3. Handle Image Uploads
        const images = formData.getAll("images") as File[];
        let imageUrls: string[] = [];
        if (images.length > 0) {
            try {
                // Use Promise.all to upload all at once, saving time
                imageUrls = await Promise.all(
                    images
                        .filter(img => img.size > 0)
                        .map(async (image) => {
                            return await uploadToR2(await image.arrayBuffer(), image.name, image.type);
                        })
                );
            } catch (uploadError: any) {
                console.error("[API/Trades] Image upload failed:", uploadError);
            }
        }

        const batchId = `BATCH-${Date.now()}-${session.user.id}`;
        const createdTrades: any[] = [];
        const baseTradeCount = await prisma.trade.count();

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const tradeId = `GC-${new Date().getFullYear()}-${(baseTradeCount + i + 1).toString().padStart(6, "0")}`;
            const cardCodeHash = cardCodeHashes[i];

            const rateRecord = relevantRates.find(r =>
                r.cardBrand === card.cardBrand &&
                r.cardCountry === card.cardCountry &&
                r.cardType === card.cardType
            );
            const calculatedPayout = rateRecord ? (card.faceValue * rateRecord.rate) : null;

            // 4. Save to Database
            const trade = await prisma.trade.create({
                data: {
                    tradeId,
                    fullName: cards.length > 1 ? batchId : null,
                    userId: parseInt(session.user.id),
                    payoutMethod: payoutMethod as any,
                    payoutNetwork,
                    payoutPhoneNumber,
                    payoutAccountName,
                    cryptoCoin: cryptoCoin as any,
                    cryptoNetwork: cryptoNetwork as any,
                    cryptoExchange: cryptoExchange as any,
                    cryptoReceiverIdType: cryptoReceiverIdType as any,
                    cryptoReceiverId,
                    cardBrand: card.cardBrand,
                    cardCountry: card.cardCountry,
                    cardType: card.cardType,
                    faceValue: card.faceValue,
                    currency: card.currency,
                    cardCode: card.cardCode,
                    serialNumber: card.serialNumber || "",
                    calculatedPayout,
                    cardCodeHash,
                    imageUrls: JSON.stringify(imageUrls),
                    adminNotes: notes,
                }
            });
            createdTrades.push(trade);
        }

        // 5. Send Emails in Background Job (Non-Blocking)
        after(async () => {
            try {
                const user = await prisma.user.findUnique({ 
                    where: { id: parseInt(session.user.id) },
                    select: { id: true, email: true, username: true, phoneNumber: true, emailNotificationsEnabled: true, role: true }
                });

                if (user) {
                    if (user.emailNotificationsEnabled) {
                        await sendTradeSubmittedEmail({ email: user.email, username: user.username }, createdTrades).catch(err => console.error("User email failed", err));
                    }
                    await sendAdminNewTradeEmail(createdTrades, { username: user.username, email: user.email, phoneNumber: user.phoneNumber }).catch(err => console.error("Admin email failed", err));
                }

                // NEW: FCM for Admin (New Trade Submission)
                try {
                    const { sendFcmNotification } = await import("@/lib/fcm");
                    const admins = await prisma.user.findMany({ 
                        where: { role: 'ADMIN', fcmToken: { not: null } },
                        select: { fcmToken: true } 
                    });
                    
                    for (const admin of admins) {
                        if (admin.fcmToken) {
                            await sendFcmNotification(
                                admin.fcmToken, 
                                "🚨 New Trade Submitted", 
                                `${user?.username || 'A user'} just submitted a ${createdTrades[0].cardBrand} trade.`
                            );
                        }
                    }
                } catch (fcmErr) {
                    console.error("Admin trade submission FCM failed", fcmErr);
                }
            } catch (bgError) {
                console.error("Background email process failed:", bgError);
            }
        });

        return NextResponse.json({ tradeId: createdTrades[0].tradeId, batchId }, { status: 201 });
    } catch (error: any) {
        console.error("❌ Trade submission failed:", error);
        return NextResponse.json(
            { message: error.message || "Internal server error", details: error.message },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const tradeId = searchParams.get("tradeId");

        // If tradeId is provided, fetch just that one
        if (tradeId) {
            const trade = await prisma.trade.findUnique({
                where: {
                    tradeId,
                    userId: parseInt(session.user.id)
                }
            });

            if (!trade) {
                return NextResponse.json({ message: "Trade not found" }, { status: 404 });
            }

            return NextResponse.json(trade);
        }

        // Otherwise list all for user
        const trades = await prisma.trade.findMany({
            where: { userId: parseInt(session.user.id) },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(trades);
    } catch (error: any) {
        console.error("❌ GET /api/trades failed:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
