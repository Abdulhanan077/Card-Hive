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

        // --- Calculate Analytics ---
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // 1. Trades Metrics
        const trades = await prisma.trade.findMany({
            select: {
                status: true,
                faceValue: true,
                calculatedPayout: true,
                createdAt: true,
            }
        });

        const totalTradesCount = trades.length;
        const todaysTradesCount = trades.filter(t => t.createdAt >= startOfToday).length;
        const pendingCount = trades.filter(t => t.status === "PENDING").length;
        const reviewingCount = trades.filter(t => t.status === "UNDER_REVIEW").length;
        const successfulCount = trades.filter(t => ["PAID", "COMPLETED"].includes(t.status)).length;
        const rejectedCount = trades.filter(t => t.status === "REJECTED").length;

        const totalGhsPayout = trades
            .filter(t => ["PAID", "COMPLETED"].includes(t.status))
            .reduce((sum, t) => sum + (t.calculatedPayout || 0), 0);

        const totalFaceValue = trades.reduce((sum, t) => sum + (t.faceValue || 0), 0);

        const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const pendingAlertCount = trades.filter(t => t.status === "PENDING" && t.createdAt < yesterday).length;

        const avgPayout = successfulCount > 0 ? totalGhsPayout / successfulCount : 0;
        const avgTradeValue = totalTradesCount > 0 ? totalFaceValue / totalTradesCount : 0;

        // 2. User Metrics
        const userCount = await prisma.user.count({
            where: { role: "USER" }
        });

        // 3. Security Alerts (Last 5 failed/suspicious logins)
        const securityAlerts = await prisma.loginEvent.findMany({
            where: {
                OR: [
                    { success: false },
                    { portal: "ADMIN" }
                ]
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                emailOrUsername: true,
                portal: true,
                success: true,
                ipAddress: true,
                createdAt: true,
            }
        });

        return NextResponse.json({
            success: true,
            stats: {
                totalTrades: totalTradesCount,
                todaysTrades: todaysTradesCount,
                pendingIntake: pendingCount,
                currentlyReviewing: reviewingCount,
                successfulTrades: successfulCount,
                rejectedTrades: rejectedCount,
                totalGhsPayout: totalGhsPayout,
                totalFaceValue: totalFaceValue,
                pendingAlert: pendingAlertCount,
                avgPayout: avgPayout,
                avgTradeValue: avgTradeValue,
                registeredUsers: userCount
            },
            charts: {
                statusDistribution: [
                    { name: 'Pending', value: pendingCount, color: '#f59e0b' },
                    { name: 'Rejected', value: rejectedCount, color: '#ef4444' },
                    { name: 'Reviewing', value: reviewingCount, color: '#3b82f6' },
                    { name: 'Successful', value: successfulCount, color: '#10b981' },
                ],
                volumeByStatus: [
                    { status: 'Pending', volume: trades.filter(t => t.status === 'PENDING').reduce((sum, t) => sum + t.faceValue, 0) },
                    { status: 'Reviewing', volume: trades.filter(t => t.status === 'UNDER_REVIEW').reduce((sum, t) => sum + t.faceValue, 0) },
                    { status: 'Successful', volume: trades.filter(t => ["PAID", "COMPLETED"].includes(t.status)).reduce((sum, t) => sum + t.faceValue, 0) },
                    { status: 'Rejected', volume: trades.filter(t => t.status === 'REJECTED').reduce((sum, t) => sum + t.faceValue, 0) },
                ]
            },
            securityAlerts: securityAlerts
        });

    } catch (error) {
        console.error("Admin Mobile Stats API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
