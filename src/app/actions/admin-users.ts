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

export async function adminDeleteUser(userId: number) {
    // Find the user first to get their email for anonymization
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
    });

    if (!user) {
        throw new Error("User not found");
    }

    // Perform Soft Delete / Anonymization
    await prisma.user.update({
        where: { id: userId },
        data: {
            status: "DELETED",
            deletedAt: new Date(),
            email: `${user.email}.deleted.${Date.now()}`,
            phoneNumber: "DELETED",
            password: `DELETED_${Math.random().toString(36).substring(7)}`,
            lastIp: null,
            lastDevice: null,
            fcmToken: null
        }
    });

    // Clear sessions
    await prisma.session.deleteMany({
        where: { userId: userId }
    });

    revalidatePath("/admin/users");
    return { success: true };
}
