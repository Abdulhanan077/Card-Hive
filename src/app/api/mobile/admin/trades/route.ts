import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";

export async function GET(request: Request) {
    try {
        const token = request.headers.get("Authorization")?.split(" ")[1];

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await verifyMobileToken(token);
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        const whereClause: any = {};
        if (status && status !== 'ALL') {
            whereClause.status = status;
        }

        const trades = await prisma.trade.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: { username: true, email: true }
                },
                _count: {
                    select: {
                        messages: {
                            where: { isRead: false, sender: { role: "USER" } }
                        }
                    }
                }
            }
        });

        // Grouping logic for batches (matching web portal)
        const groupedTrades: any[] = [];
        const processedBatches = new Set();

        trades.forEach(t => {
            if (!t.fullName || !t.fullName.startsWith('BATCH-')) {
                groupedTrades.push({ 
                    ...t, 
                    isBatch: false, 
                    cardCount: 1,
                    unreadCount: (t._count as any).messages 
                });
            } else if (!processedBatches.has(t.fullName)) {
                const batchMembers = trades.filter(tm => tm.fullName === t.fullName);
                const totalValue = batchMembers.reduce((sum, tm) => sum + tm.faceValue, 0);
                const batchUnreadCount = batchMembers.reduce((sum: number, tm: any) => sum + (tm._count?.messages || 0), 0);

                groupedTrades.push({
                    ...t,
                    isBatch: true,
                    batchId: t.fullName,
                    cardCount: batchMembers.length,
                    totalValue,
                    unreadCount: batchUnreadCount,
                    batchBrands: Array.from(new Set(batchMembers.map(tm => tm.cardBrand))).join(", ")
                });
                processedBatches.add(t.fullName);
            }
        });

        return NextResponse.json({ 
            success: true, 
            trades: groupedTrades 
        });

    } catch (error) {
        console.error("Admin Mobile Trades API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
