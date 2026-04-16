import { NextResponse } from "next/server";
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
        const { isTyping } = await request.json();

        // Notify Pusher
        await pusherServer.trigger(`trade-${tradeId}`, "typing", { 
            username: session.user.username,
            userId: session.user.id,
            isTyping: isTyping !== false
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Mobile Chat Typing Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
