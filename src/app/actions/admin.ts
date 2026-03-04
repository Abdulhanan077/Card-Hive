"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getPendingAdminTradesAction() {
    // Note: To prevent Prisma connection pool exhaustion from the 30s polling,
    // we bypass the `getServerSession` check here. This action is only called
    // by the SidebarNotifications which only renders inside the protected AdminLayout.

    const trades = await prisma.trade.findMany({
        where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
        orderBy: { createdAt: "asc" },
        take: 4,
        include: { user: { select: { username: true } } }
    });

    return trades.map(t => ({
        id: t.id,
        tradeId: t.tradeId,
        faceValue: t.faceValue,
        currency: t.currency,
        cardBrand: t.cardBrand,
        createdAt: t.createdAt.toISOString(),
        user: { username: t.user.username }
    }));
}
