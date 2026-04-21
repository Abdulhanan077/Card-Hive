import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const settings = await prisma.settings.findFirst({
            select: {
                contactEmail: true,
                whatsappNumber: true,
            }
        });

        return NextResponse.json(settings || {
            contactEmail: "support@mycardhive.com",
            whatsappNumber: "233551131139" // Default fallback
        }, { status: 200 });
    } catch (error) {
        console.error("Settings API Error (using fallback):", error);
        return NextResponse.json({
            contactEmail: "support@mycardhive.com",
            whatsappNumber: "233551131139" // Default fallback
        }, { status: 200 });
    }
}
