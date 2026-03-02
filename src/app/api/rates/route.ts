import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // Use raw SQL to bypass Prisma Client's internal validation of fields
        // since the environment is having trouble generating the updated client.
        const rates = await prisma.$queryRawUnsafe(`SELECT id, "cardBrand", "cardCountry", "cardType", rate, "publicRate", "updatedAt" FROM "CardRate"`);
        return NextResponse.json({ rates });
    } catch (error) {
        console.error("Rates API Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
