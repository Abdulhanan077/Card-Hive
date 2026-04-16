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

        const rates: any = await prisma.$queryRawUnsafe(`SELECT * FROM "CardRate" ORDER BY "cardBrand" ASC`);
        return NextResponse.json({ success: true, rates });

    } catch (error) {
        console.error("Admin Mobile Rates API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const token = request.headers.get("Authorization")?.split(" ")[1];
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const admin = await verifyMobileToken(token);
        if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const { id, cardBrand, cardCountry, cardType, rate, publicRate } = await request.json();

        if (id) {
            // Update existing
            const updatedRate = await prisma.cardRate.update({
                where: { id: Number(id) },
                data: {
                    cardBrand,
                    cardCountry,
                    cardType,
                    rate: Number(rate),
                    publicRate: publicRate ? Number(publicRate) : null,
                }
            });
            return NextResponse.json({ success: true, rate: updatedRate });
        } else {
            // Add new
            const newRate = await prisma.cardRate.create({
                data: {
                    cardBrand,
                    cardCountry,
                    cardType,
                    rate: Number(rate),
                    publicRate: publicRate ? Number(publicRate) : null,
                }
            });
            return NextResponse.json({ success: true, rate: newRate });
        }
    } catch (error) {
        console.error("Admin Mobile Rates Action Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const token = request.headers.get("Authorization")?.split(" ")[1];
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const admin = await verifyMobileToken(token);
        if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await prisma.cardRate.delete({
            where: { id: Number(id) }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Admin Mobile Rates Delete Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
