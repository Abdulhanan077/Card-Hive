"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getUnreadUserNotifications() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    const userId = parseInt(session.user.id);

    // Get unread messages sent by admins for this user
    const unreadMessages = await prisma.message.findMany({
        where: {
            isRead: false,
            sender: {
                role: "ADMIN"
            },
            trade: {
                userId: userId
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
