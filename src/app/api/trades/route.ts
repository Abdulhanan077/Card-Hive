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
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();

        // Extract fields
        const payoutNetwork = formData.get("payoutNetwork") as string;
        const payoutPhoneNumber = formData.get("payoutPhoneNumber") as string;
        const cardBrand = formData.get("cardBrand") as string;
        const cardCountry = formData.get("cardCountry") as string;
        const cardType = formData.get("cardType") as string;
        const faceValue = parseFloat(formData.get("faceValue") as string);
        const currency = formData.get("currency") as string;
        const cardCode = formData.get("cardCode") as string;
        const serialNumber = (formData.get("serialNumber") as string) || "";
        const notes = formData.get("notes") as string;

        if (!cardCode || !faceValue || !cardBrand) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        // 1. Duplicate Check Logic
        const rawToHash = `${cardCode}-${serialNumber}`.trim();
        const cardCodeHash = crypto.createHash("sha256").update(rawToHash).digest("hex");

        const duplicateTrade = await prisma.trade.findFirst({
            where: {
                cardCodeHash,
                status: {
                    not: "REJECTED"
                }
            }
        });

        if (duplicateTrade) {
            // Find the user who attempted this
            const attempter = await prisma.user.findUnique({ where: { id: parseInt(session.user.id) } });
            if (attempter) {
                if (attempter.emailNotificationsEnabled) {
                    sendDuplicateCardAttemptEmail({ email: attempter.email, username: attempter.username }, { cardBrand, faceValue, currency });
                }
                sendAdminDuplicateAlert(
                    { cardBrand, faceValue, currency },
                    [duplicateTrade],
                    { username: attempter.username, email: attempter.email }
                );
            }

            return NextResponse.json(
                { message: "This card appears to have already been submitted. If you believe this is a mistake, please contact support." },
                { status: 409 }
            );
        }

        // 2. Handle Image Uploads
        const images = formData.getAll("images") as File[];
        const imageUrls: string[] = [];

        if (images.length > 0) {
            for (const image of images) {
                if (image.size > 0) {
                    const uniqueName = `${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.]/g, "")}`;

                    const buffer = Buffer.from(await image.arrayBuffer());

                    const command = new PutObjectCommand({
                        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
                        Key: uniqueName,
                        Body: buffer,
                        ContentType: image.type,
                    });

                    await s3Client.send(command);

                    // Reconstruct the public R2 domain URL
                    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${uniqueName}`;
                    imageUrls.push(publicUrl);
                }
            }
        }

        // 3. Generate Trade ID
        const count = await prisma.trade.count();
        const tradeId = `GC-${new Date().getFullYear()}-${(count + 1).toString().padStart(6, "0")}`;

        // Fetch active rate
        const rateRecord = await prisma.cardRate.findUnique({
            where: {
                cardBrand_cardCountry: { cardBrand, cardCountry }
            }
        });

        let calculatedPayout = null;
        if (rateRecord) {
            calculatedPayout = faceValue * rateRecord.rate;
        }

        // 4. Save to Database
        const trade = await prisma.trade.create({
            data: {
                tradeId,
                userId: parseInt(session.user.id),
                payoutNetwork,
                payoutPhoneNumber,
                cardBrand,
                cardCountry,
                cardType,
                faceValue,
                currency,
                cardCode,
                serialNumber,
                calculatedPayout,
                cardCodeHash,
                imageUrls: JSON.stringify(imageUrls),
                adminNotes: notes, // Store initial notes logic if needed, or create separate field
            }
        });

        const user = await prisma.user.findUnique({ where: { id: parseInt(session.user.id) } });
        if (user) {
            if (user.emailNotificationsEnabled) {
                sendTradeSubmittedEmail({ email: user.email, username: user.username }, trade);
            }
            sendAdminNewTradeEmail(trade, { username: user.username, email: user.email, phoneNumber: user.phoneNumber });
        }

        return NextResponse.json({ tradeId: trade.tradeId }, { status: 201 });
    } catch (error) {
        console.error("Trade submission error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
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
