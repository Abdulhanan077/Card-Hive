"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function logoutSession(sessionToken: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    await prisma.session.delete({
        where: {
            sessionToken,
            userId: parseInt(session.user.id)
        }
    });

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

    await prisma.session.deleteMany({
        where: {
            userId,
            sessionToken: { not: currentToken }
        }
    });


    revalidatePath("/user/security");
    return { success: true };
}

export async function trackSession() {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false };

    const cookieStore = await cookies();
    const currentToken = cookieStore.get("next-auth.session-token")?.value ||
        cookieStore.get("__Secure-next-auth.session-token")?.value;

    if (!currentToken) return { success: false };

    const { headers } = await import("next/headers");
    const headerList = await headers();
    let ip = headerList.get("x-forwarded-for")?.split(',')[0] || headerList.get("x-real-ip") || "unknown";
    if (ip === "::1" || ip === "127.0.0.1") ip = "127.0.0.1 (Localhost)";
    const uaDescription = headerList.get("user-agent") || "";

    let deviceString = "Unknown Device";
    try {
        const { UAParser } = await import("ua-parser-js");
        const parser = new UAParser(uaDescription);
        const browser = parser.getBrowser();
        const os = parser.getOS();
        const device = parser.getDevice();
        deviceString = `${browser.name || "Unknown"} on ${os.name || "Unknown"} ${device.model ? `(${device.model})` : ""}`;
    } catch (e) { }

    // Check if session was updated recently to prevent excessive DB calls
    const existingSession = await prisma.session.findUnique({
        where: { sessionToken: currentToken },
        select: { lastActive: true }
    });

    if (existingSession && existingSession.lastActive) {
        const diff = Date.now() - new Date(existingSession.lastActive).getTime();
        if (diff < 60000) return { success: true, throttled: true };
    }

    await prisma.session.upsert({
        where: { sessionToken: currentToken },
        update: {
            lastActive: new Date(),
            ipAddress: ip,
            deviceInfo: deviceString,
        },
        create: {
            sessionToken: currentToken,
            userId: parseInt(session.user.id),
            expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            ipAddress: ip,
            userAgent: uaDescription,
            deviceInfo: deviceString,
            lastActive: new Date(),
        }
    });

    return { success: true };
}
