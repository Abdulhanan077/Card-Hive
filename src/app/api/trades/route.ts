import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
    sendDuplicateCardAttemptEmail,
    sendAdminDuplicateAlert,
    sendTradeSubmittedEmail,
    sendAdminNewTradeEmail
} from "@/lib/email";

const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
});

export async function POST(req: Request) {
    try {
        console.log("🚀 POST /api/trades started");
        console.log("DEBUG: DATABASE_URL check:", process.env.DATABASE_URL?.split('@')[1] || "Not found");

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
        const cryptoCoin = formData.get("cryptoCoin") as any;
        const cryptoNetwork = formData.get("cryptoNetwork") as any;
        const cryptoExchange = formData.get("cryptoExchange") as any;
        const cryptoReceiverIdType = formData.get("cryptoReceiverIdType") as any;
        const cryptoReceiverId = formData.get("cryptoReceiverId") as string;

        const notes = formData.get("notes") as string;

        // Extract cards data
        const cardsJson = formData.get("cards") as string;
        if (!cardsJson) {
            return NextResponse.json({ message: "No cards provided" }, { status: 400 });
        }

        const cards = JSON.parse(cardsJson) as Array<{
            cardBrand: string;
            cardCountry: string;
            cardType: string;
            faceValue: number;
            currency: string;
            cardCode: string;
            serialNumber?: string;
        }>;

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
        // We fetch all rates for the brands involved in the whole batch
        const brands = Array.from(new Set(cards.map(c => c.cardBrand)));
        const relevantRates = await prisma.cardRate.findMany({
            where: {
                cardBrand: { in: brands }
            }
        });

        // 3. Handle Image Uploads... (already optimized)
        const images = formData.getAll("images") as File[];
        const imageUrls: string[] = [];
        if (images.length > 0) {
            for (const image of images) {
                if (image.size > 0) {
                    const uniqueName = `${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.]/g, "")}`;
                    await s3Client.send(new PutObjectCommand({
                        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
                        Key: uniqueName,
                        Body: Buffer.from(await image.arrayBuffer()),
                        ContentType: image.type,
                    }));
                    imageUrls.push(`${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${uniqueName}`);
                }
            }
        }

        const batchId = `BATCH-${Date.now()}-${session.user.id}`;
        const createdTrades = [];
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
                    fullName: batchId,
                    userId: parseInt(session.user.id),
                    payoutMethod: payoutMethod as any,
                    payoutNetwork,
                    payoutPhoneNumber,
                    payoutAccountName,
                    cryptoCoin,
                    cryptoNetwork,
                    cryptoExchange,
                    cryptoReceiverIdType,
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

        const user = await prisma.user.findUnique({ where: { id: parseInt(session.user.id) } });
        if (user) {
            // Send one email for the whole batch
            if (user.emailNotificationsEnabled) {
                await sendTradeSubmittedEmail({ email: user.email, username: user.username }, createdTrades);
            }
            await sendAdminNewTradeEmail(createdTrades, { username: user.username, email: user.email, phoneNumber: user.phoneNumber });
        }

        return NextResponse.json({ tradeId: createdTrades[0].tradeId, batchId }, { status: 201 });
    } catch (error: any) {
        console.error("DEBUG: Trade submission detailed error:", error);
        console.error("DEBUG META:", JSON.stringify(error.meta));

        // Detailed logging for each card specifically if reached
        return NextResponse.json({
            message: "Internal server error",
            debug: {
                message: error.message,
                code: error.code,
                meta: error.meta,
                name: error.name
            }
        }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Logged in users fetch only their trades
        // Admins can be handled via a different route or passing a query param,
        // but we'll stick to a separate admin route for pure admin management.

        const url = new URL(req.url);
        const limit = url.searchParams.get("limit");

        const queryOpts: any = {
            where: { userId: parseInt(session.user.id) },
            orderBy: { createdAt: "desc" },
        };

        if (limit) queryOpts.take = parseInt(limit);

        const trades = await prisma.trade.findMany(queryOpts);

        return NextResponse.json({ trades });
    } catch (error) {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
