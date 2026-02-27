import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendPasswordResetOTPEmail } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ message: "Email is required" }, { status: 400 });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json(
                { message: "No account found with this email" },
                { status: 404 }
            );
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // Expiration time: 10 minutes from now
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Upsert into DB
        await prisma.passwordResetOTP.upsert({
            where: { email },
            update: { otp, expiresAt },
            create: { email, otp, expiresAt },
        });

        // Send Email
        await sendPasswordResetOTPEmail(email, otp);

        // Intentionally logging to console for dev
        console.log(`[DEV] Password Reset OTP for ${email}: ${otp}`);

        return NextResponse.json({ message: "Verification code sent successfully" }, { status: 200 });

    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json(
            { message: "Failed to send reset code" },
            { status: 500 }
        );
    }
}
