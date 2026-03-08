"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function updateUserTheme(theme: "light" | "dark") {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: "Not authenticated" };

        await prisma.user.update({
            where: { id: parseInt(session.user.id) },
            data: { theme }
        });

        return { success: true };
    } catch (error) {
        console.error("Failed to update user theme:", error);
        return { success: false, error: "Internal server error" };
    }
}
