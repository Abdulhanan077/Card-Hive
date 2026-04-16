import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const tradeId = parseInt((await props.params).id);
        const { messageId } = await request.json();

        if (messageId) {
            await prisma.message.update({
                where: { id: messageId },
                data: {
                    isRead: true,
                    readAt: new Date()
                }
            });
        } else {
            // Mark all unread messages as read for this trade that were not sent by this user
            await prisma.message.updateMany({
                where: { 
                    tradeId, 
                    senderId: { not: parseInt(session.user.id) },
                    isRead: false 
                },
                data: {
                    isRead: true,
                    readAt: new Date()
                }
            });
        }

        // Notify Pusher
        await pusherServer.trigger(`trade-${tradeId}`, "message-seen", { 
            messageId, 
            userId: session.user.id 
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Mobile Chat Seen Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
