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

    // Trigger Pusher event for the specific trade chat
    await pusherServer.trigger(`trade-${tradeId}`, "new-message", newMessage);

    // If sender is a USER, notify admins
    if (newMessage.sender.role === "USER") {
        try {
            // Trigger a general admin notification event
            await pusherServer.trigger("admin-notifications", "new-message-alert", {
                tradeId: tradeId,
                sender: newMessage.sender.username
            });

            // Send email to admin
            // We need the tradeId string (GC-...) not the numeric ID
            const trade = await prisma.trade.findUnique({
                where: { id: tradeId },
                select: { tradeId: true }
            });

            if (trade) {
                const { sendAdminNewMessageEmail } = await import("@/lib/email");
                await sendAdminNewMessageEmail(newMessage, trade.tradeId, newMessage.sender);
            }
        } catch (error) {
            console.error("Failed to send admin notification", error);
        }
    }

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
