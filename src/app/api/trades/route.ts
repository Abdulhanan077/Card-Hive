import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import fs from "fs";

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
            return NextResponse.json(
                { message: "This card appears to have already been submitted. If you believe this is a mistake, please contact support." },
                { status: 409 }
            );
        }

        // 2. Handle Image Uploads
        const images = formData.getAll("images") as File[];
        const imageUrls: string[] = [];

        if (images.length > 0) {
            const uploadDir = path.join(process.cwd(), "public/uploads");
            if (!fs.existsSync(uploadDir)) {
                await mkdir(uploadDir, { recursive: true });
            }

            for (const image of images) {
                if (image.size > 0) {
                    const bytes = await image.arrayBuffer();
                    const buffer = Buffer.from(bytes);
                    const uniqueName = `${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.]/g, "")}`;
                    const filePath = path.join(uploadDir, uniqueName);
                    await writeFile(filePath, buffer);
                    imageUrls.push(`/uploads/${uniqueName}`);
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
