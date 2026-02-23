"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getPendingAdminTradesAction() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

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
