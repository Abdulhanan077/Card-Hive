"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function trackVisitor(path: string) {
  try {
    const headersList = await headers();
    
    // Attempt to get the real IP if behind a proxy
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    let ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || "Unknown");
    
    if (ipAddress === "Unknown") {
       ipAddress = headersList.get("remote-addr") || "Unknown";
    }

    const userAgent = headersList.get("user-agent") || "Unknown";
    
    // Parse user agent minimally for device/browser/os if needed, or just store the raw string
    // Here we can use a basic regex or library if they have one, but let's just store userAgent directly
    // and attempt to extract some basic device info
    let device = "Desktop";
    if (/mobile/i.test(userAgent)) device = "Mobile";
    else if (/tablet/i.test(userAgent)) device = "Tablet";

    let browser = "Unknown";
    if (/chrome/i.test(userAgent)) browser = "Chrome";
    else if (/firefox/i.test(userAgent)) browser = "Firefox";
    else if (/safari/i.test(userAgent)) browser = "Safari";
    else if (/edge/i.test(userAgent)) browser = "Edge";
    
    let os = "Unknown";
    if (/windows/i.test(userAgent)) os = "Windows";
    else if (/mac/i.test(userAgent)) os = "Mac OS";
    else if (/linux/i.test(userAgent)) os = "Linux";
    else if (/android/i.test(userAgent)) os = "Android";
    else if (/ios|iphone|ipad/i.test(userAgent)) os = "iOS";

    // Optional: avoid duplicate tracking for the same IP + Path within a short timeframe (e.g. 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existing = await prisma.visitorLog.findFirst({
        where: {
            ipAddress,
            path,
            createdAt: { gte: fiveMinutesAgo }
        }
    });

    if (existing) {
        return { success: true, message: "Already tracked recently" };
    }

    await prisma.visitorLog.create({
      data: {
        ipAddress,
        userAgent,
        path,
        device,
        browser,
        os,
        // country and city could be extracted from headers if Vercel (x-vercel-ip-country, x-vercel-ip-city)
        country: headersList.get("x-vercel-ip-country") || "Unknown",
        city: headersList.get("x-vercel-ip-city") || "Unknown",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error tracking visitor:", error);
    return { success: false, error: "Failed to track visitor" };
  }
}
