"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { pusherServer } from "@/lib/pusher";

export async function postMessage(tradeId: number, content: string, path: string, fileUrl?: string, fileType?: 'IMAGE' | 'FILE') {
    console.log(`[postMessage] Entering: tradeId=${tradeId}, content length=${content.length || 0}`);
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Use raw SQL to bypass Prisma Client validation for the new columns (fileUrl, fileType)
    // We explicitly name the columns in the result to ensure camelCase mapping
    const newMessageResult = await prisma.$queryRaw<any[]>`
        INSERT INTO "Message" ("tradeId", "senderId", "content", "fileUrl", "fileType", "isRead", "createdAt")
        VALUES (${tradeId}, ${parseInt(session.user.id)}, ${content}, ${fileUrl || null}, ${fileType || null}, false, NOW())
        RETURNING id AS id, "tradeId" AS "tradeId", "senderId" AS "senderId", content AS content, "isRead" AS "isRead", "readAt" AS "readAt", "fileUrl" AS "fileUrl", "fileType" AS "fileType", "createdAt" AS "createdAt"
    `;

    if (!newMessageResult || newMessageResult.length === 0) {
        throw new Error("Failed to create message via raw SQL");
    }
    console.log(`[postMessage] message created in DB, id=${newMessageResult[0].id}`);

    const rawMsg = newMessageResult[0];
    const newMessage: any = {
        id: rawMsg.id,
        tradeId: rawMsg.tradeId,
        senderId: rawMsg.senderId,
        content: rawMsg.content || "",
        isRead: Boolean(rawMsg.isRead),
        readAt: rawMsg.readAt ? new Date(rawMsg.readAt) : null,
        fileUrl: rawMsg.fileUrl || null,
        fileType: rawMsg.fileType || null,
        createdAt: new Date(rawMsg.createdAt)
    };

    // Fetch sender separately for Pusher/Email logic
    newMessage.sender = await prisma.user.findUnique({
        where: { id: newMessage.senderId },
        select: { id: true, username: true, role: true }
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

            // NEW: FCM for Admins
            const admins = await prisma.user.findMany({ where: { role: 'ADMIN', fcmToken: { not: null } }, select: { fcmToken: true } });
            const { sendFcmNotification } = await import("@/lib/fcm");
            for (const admin of admins) {
                if (admin.fcmToken) await sendFcmNotification(admin.fcmToken, `New Message: @${newMessage.sender.username}`, content.length > 50 ? content.substring(0, 47) + '...' : content);
            }

            // Send email to admin
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
    } else if (newMessage.sender.role === "ADMIN") {
        try {
            // Fetch the trade to determine which user to notify
            const trade = await prisma.trade.findUnique({
                where: { id: tradeId },
                include: { user: { select: { id: true, fcmToken: true } } }
            });
            if (trade) {
                // Trigger an event on the user-specific notification channel
                await pusherServer.trigger(`user-notifications-${trade.userId}`, "new-message-alert", {
                    tradeId: tradeId,
                    sender: "Admin"
                });

                // NEW: FCM for User
                if (trade.user.fcmToken) {
                    const { sendFcmNotification } = await import("@/lib/fcm");
                    await sendFcmNotification(trade.user.fcmToken, "New Message from Admin", content.length > 50 ? content.substring(0, 47) + '...' : content);
                }
            }
        } catch (error) {
            console.error("Failed to trigger user pusher notification", error);
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

export async function uploadChatFileAction(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    const { uploadToR2 } = await import("@/lib/upload");
    const buffer = await file.arrayBuffer();
    const url = await uploadToR2(buffer, file.name, file.type);

    return { url, type: file.type.startsWith('image/') ? 'IMAGE' : 'FILE' };
}
export async function deleteMessageAction(messageId: number, tradeId: number) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    // 1. Check ownership or admin status
    const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { senderId: true }
    });

    if (!message) throw new Error("Message not found");

    // Admins can delete any message, users only their own
    const isAdmin = session.user.role === "ADMIN";
    if (message.senderId !== parseInt(session.user.id) && !isAdmin) {
        throw new Error("You can only delete your own messages");
    }

    // 2. Delete via raw SQL (to be consistent with our previous raw SQL usage)
    await prisma.$executeRaw`DELETE FROM "Message" WHERE id = ${messageId}`;

    // 3. Trigger Pusher event
    await pusherServer.trigger(`trade-${tradeId}`, "message-deleted", { messageId });

    return { success: true };
}

export async function editMessageAction(messageId: number, tradeId: number, newContent: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    if (!newContent.trim()) throw new Error("Content cannot be empty");

    // 1. Check ownership
    const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { senderId: true }
    });

    if (!message) throw new Error("Message not found");
    if (message.senderId !== parseInt(session.user.id)) {
        throw new Error("You can only edit your own messages");
    }

    // 2. Update via raw SQL
    await prisma.$executeRaw`
        UPDATE "Message" 
        SET content = ${newContent}, "isEdited" = true 
        WHERE id = ${messageId}
    `;

    // 3. Trigger Pusher event
    await pusherServer.trigger(`trade-${tradeId}`, "message-updated", {
        messageId,
        content: newContent
    });

    return { success: true };
}
