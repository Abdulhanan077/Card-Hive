import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";

export async function GET(request: Request) {
    try {
        const token = request.headers.get("Authorization")?.split(" ")[1];

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const admin = await verifyMobileToken(token);
        if (!admin || admin.role !== 'ADMIN') {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const settings = await prisma.settings.findFirst();
        return NextResponse.json({ success: true, settings });

    } catch (error) {
        console.error("Admin Mobile Settings API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const token = request.headers.get("Authorization")?.split(" ")[1];
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const admin = await verifyMobileToken(token);
        if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const body = await request.json();
        const { siteName, contactEmail, whatsappNumber, referralBonusPercentage, rewardPointsToGhs, usdtExchangeRate } = body;

        const existingSettings = await prisma.settings.findFirst();

        const data: any = {
            siteName,
            contactEmail,
            whatsappNumber,
            referralBonusPercentage: referralBonusPercentage ? Number(referralBonusPercentage) : undefined,
            rewardPointsToGhs: rewardPointsToGhs ? Number(rewardPointsToGhs) : undefined,
            usdtExchangeRate: usdtExchangeRate ? Number(usdtExchangeRate) : undefined,
        };

        if (existingSettings) {
            // Update
            await prisma.settings.update({
                where: { id: existingSettings.id },
                data
            });
        } else {
            // Create
            await prisma.settings.create({ data });
        }

        return NextResponse.json({ success: true, message: "Settings updated successfully" });

    } catch (error) {
        console.error("Admin Mobile Settings Action Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
