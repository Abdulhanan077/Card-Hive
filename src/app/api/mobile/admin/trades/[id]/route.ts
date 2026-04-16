import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const token = request.headers.get("Authorization")?.split(" ")[1];

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const admin = await verifyMobileToken(token);
        if (!admin || admin.role !== 'ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const trade = await prisma.trade.findUnique({
            where: { 
                id: parseInt(params.id) 
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
    } catch (error) {
        console.error("Fetch Admin Trade Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
