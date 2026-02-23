"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function postMessage(tradeId: number, content: string, path: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.message.create({
        data: {
            tradeId,
            senderId: parseInt(session.user.id),
            content,
        }
    });

    revalidatePath(path);
}
