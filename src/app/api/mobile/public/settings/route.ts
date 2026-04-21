import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const settings = await prisma.settings.findFirst({
            select: {
                siteName: true,
                contactEmail: true,
                whatsappNumber: true,
                referralBonusPercentage: true,
                rewardPointsToGhs: true,
                usdtExchangeRate: true,
            }
        });

        return NextResponse.json({
            success: true,
            settings: settings || {
                siteName: "MyCardHive",
                contactEmail: "support@mycardhive.com",
                whatsappNumber: "",
                referralBonusPercentage: 1.5,
                rewardPointsToGhs: 100.0,
                usdtExchangeRate: 15.0,
            }
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message }, { status: 500 });
    }
}
