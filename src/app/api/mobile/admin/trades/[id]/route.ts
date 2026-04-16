import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.headers.get("Authorization")?.split(" ")[1];

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const admin = await verifyMobileToken(token);
        if (!admin || admin.role !== 'ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const tradeId = parseInt(id);
        if (isNaN(tradeId)) {
            console.error("Invalid Trade ID provided:", id);
            return NextResponse.json({ error: "Invalid Trade ID" }, { status: 400 });
        }

        const trade = await prisma.trade.findUnique({
            where: { 
                id: tradeId 
            },
            include: {
                user: {
                    select: {
                        username: true,
                        email: true,
                        phoneNumber: true
                    }
                },
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: { sender: { select: { username: true, role: true } } }
                }
            }
        });

        if (!trade) {
            return NextResponse.json({ error: "Trade not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, trade });
    } catch (error: any) {
        console.error("ADMIN_FETCH_TRADE_ERROR:", error);
        return NextResponse.json({ 
            error: "Internal Server Error", 
            details: error?.message || "Unknown error",
            stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        }, { status: 500 });
    }
}
