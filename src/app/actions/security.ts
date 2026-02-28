"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function logoutSession(sessionToken: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    /*
    await prisma.session.delete({
        where: {
            sessionToken,
            userId: parseInt(session.user.id)
        }
    });
    */

    revalidatePath("/user/security");
    return { success: true };
}

export async function logoutOtherSessions() {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const userId = parseInt(session.user.id);
    const cookieStore = await cookies();

    // Try to find the current session token from cookies
    // NextAuth uses 'next-auth.session-token' or '__Secure-next-auth.session-token'
    const currentToken = cookieStore.get("next-auth.session-token")?.value ||
        cookieStore.get("__Secure-next-auth.session-token")?.value;

    if (!currentToken) {
        throw new Error("Could not identify current session");
    }

    /*
    await prisma.session.deleteMany({
        where: {
            userId,
            sessionToken: { not: currentToken }
        }
    });
    */

    revalidatePath("/user/security");
    return { success: true };
}
