"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateUserRewardPoints(userId: number, amount: number, action: "add" | "deduct") {
    if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid points amount");
    }

    const modifier = action === "deduct" ? -amount : amount;

    await prisma.user.update({
        where: { id: userId },
        data: { rewardBalance: { increment: modifier } },
    });

    revalidatePath("/admin/users");
    return { success: true };
}

export async function updateUserVipTrades(userId: number, count: number) {
    if (isNaN(count) || count < 0) {
        throw new Error("Invalid trades count");
    }

    await prisma.user.update({
        where: { id: userId },
        data: { completedTradesCount: count }
    });

    revalidatePath("/admin/users");
    return { success: true };
}

export async function updateUserStatus(userId: number, status: "ACTIVE" | "BLOCKED") {
    await prisma.user.update({
        where: { id: userId },
        data: { status }
    });

    revalidatePath("/admin/users");
    return { success: true };
}
