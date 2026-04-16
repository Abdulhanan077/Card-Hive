import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";
import { Prisma } from "@prisma/client";

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

        const { searchParams } = new URL(request.url);
        const query = searchParams.get("query");
        const sortBy = searchParams.get("sort") || "newest";

        const whereClause: Prisma.UserWhereInput = { role: "USER" };

        if (query) {
            whereClause.OR = [
                { username: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { phoneNumber: { contains: query } }
            ];
        }

        let orderByClause: any = { createdAt: "desc" };
        if (sortBy === "trades_desc") {
            orderByClause = { completedTradesCount: "desc" };
        } else if (sortBy === "points_desc") {
            orderByClause = { rewardBalance: "desc" };
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            orderBy: orderByClause,
            select: {
                id: true,
                username: true,
                email: true,
                phoneNumber: true,
                status: true,
                rewardBalance: true,
                completedTradesCount: true,
                createdAt: true,
                _count: {
                    select: {
                        trades: true,
                        referrals: true
                    }
                }
            }
        });

        const formattedUsers = users.map(user => ({
            ...user,
            tradesCount: user._count.trades,
            referralsCount: user._count.referrals,
            _count: undefined
        }));

        return NextResponse.json({ success: true, users: formattedUsers });

    } catch (error) {
        console.error("Admin Mobile Users API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
