"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
    sendTradeSubmittedEmail,
    sendTradeStatusUpdateEmail,
    sendPaymentSentEmail,
    sendOTPEmail,
    sendPasswordResetEmail,
    sendPasswordResetOTPEmail
} from "@/lib/email";
import crypto from "crypto";

async function ensureAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized: Admin access required");
    }
}

export async function resendTradeReceivedEmail(tradeId: number) {
    await ensureAdmin();
    const trade = await prisma.trade.findUnique({
        where: { id: tradeId },
        include: { user: true }
    });
    if (!trade) throw new Error("Trade not found");

    let tradesToSend: any | any[] = trade;
    if (trade.fullName && trade.fullName.startsWith('BATCH-')) {
        tradesToSend = await prisma.trade.findMany({
            where: { fullName: trade.fullName },
            include: { user: true }
        });
    }

    await sendTradeSubmittedEmail(trade.user, tradesToSend);
    return { success: true };
}

export async function resendTradeStatusEmail(tradeId: number) {
    await ensureAdmin();
    const trade = await prisma.trade.findUnique({
        where: { id: tradeId },
        include: { user: true }
    });
    if (!trade) throw new Error("Trade not found");

    let tradesToSend: any | any[] = trade;
    if (trade.fullName && trade.fullName.startsWith('BATCH-')) {
        tradesToSend = await prisma.trade.findMany({
            where: { fullName: trade.fullName },
            include: { user: true }
        });
    }

    // We don't have the "oldStatus" easily, so we just pass a placeholder or same
    await sendTradeStatusUpdateEmail(trade.user, tradesToSend, trade.status, trade.status);
    return { success: true };
}

export async function resendPaymentSentEmailAction(tradeId: number) {
    await ensureAdmin();
    const trade = await prisma.trade.findUnique({
        where: { id: tradeId },
        include: { user: true }
    });
    if (!trade) throw new Error("Trade not found");
    if (trade.status !== "PAID") throw new Error("Trade must be in PAID status to resend payment email");

    let tradesToSend: any | any[] = trade;
    if (trade.fullName && trade.fullName.startsWith('BATCH-')) {
        tradesToSend = await prisma.trade.findMany({
            where: { fullName: trade.fullName },
            include: { user: true }
        });
    }

    await sendPaymentSentEmail(trade.user, tradesToSend);
    return { success: true };
}

export async function resendVerificationEmail(userId: number) {
    await ensureAdmin();
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });
    if (!user) throw new Error("User not found");

    // Create a new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.registrationOTP.upsert({
        where: { email: user.email },
        update: { otp, expiresAt: new Date(Date.now() + 10 * 60000) },
        create: { email: user.email, otp, expiresAt: new Date(Date.now() + 10 * 60000) }
    });

    await sendOTPEmail(user.email, otp);
    return { success: true };
}

export async function resendForgotPassword(userId: number) {
    await ensureAdmin();
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });
    if (!user) throw new Error("User not found");

    /*
    // Created a new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.passwordResetOTP.upsert({
        where: { email: user.email },
        update: { otp, expiresAt: new Date(Date.now() + 10 * 60000) },
        create: { email: user.email, otp, expiresAt: new Date(Date.now() + 10 * 60000) }
    });

    await sendPasswordResetOTPEmail(user.email, otp);
    */
    return { success: false, message: "Temporarily disabled. Please run npx prisma generate." };
    return { success: true };
}
