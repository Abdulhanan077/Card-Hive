import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // Use raw SQL to bypass Prisma Client's internal validation of fields
        // since the environment is having trouble generating the updated client.
        const rates = await prisma.$queryRawUnsafe(`SELECT id, "cardBrand", "cardCountry", "cardType", rate, "publicRate", "updatedAt" FROM "CardRate"`);
        const settings: any = await prisma.$queryRawUnsafe(`SELECT "usdtExchangeRate" FROM "Settings" LIMIT 1`);
        const usdtExchangeRate = settings && settings.length > 0 ? settings[0].usdtExchangeRate : 15.0;

        return NextResponse.json({ rates, usdtExchangeRate });
    } catch (error) {
        console.error("Rates API Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
