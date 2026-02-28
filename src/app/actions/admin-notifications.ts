"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getUnreadAdminNotifications() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    // Get unread messages sent by users
    const unreadMessages = await prisma.message.findMany({
        where: {
            isRead: false,
            sender: {
                role: "USER"
            }
        },
        include: {
            sender: {
                select: { username: true }
            },
            trade: {
                select: { tradeId: true }
            }
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 10
    });

    return unreadMessages;
}
