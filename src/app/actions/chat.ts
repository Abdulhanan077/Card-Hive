"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { pusherServer } from "@/lib/pusher";

export async function postMessage(tradeId: number, content: string, path: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const newMessage = await prisma.message.create({
        data: {
            tradeId,
            senderId: parseInt(session.user.id),
            content,
        },
        include: {
            sender: {
                select: { id: true, username: true, role: true }
            }
        }
    });

    // Trigger Pusher event
    await pusherServer.trigger(`trade-${tradeId}`, "new-message", newMessage);

    revalidatePath(path);
}

export async function markMessageAsRead(messageId: number, tradeId: number) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.message.update({
        where: { id: messageId },
        data: {
            isRead: true,
            readAt: new Date()
        }
    });

    // Notify other users that the message has been read
    await pusherServer.trigger(`trade-${tradeId}`, "message-seen", { messageId });
}

export async function triggerTypingIndicator(tradeId: number, username: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return;

    await pusherServer.trigger(`trade-${tradeId}`, "typing", { username });
}
