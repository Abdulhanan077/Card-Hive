import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendOTPEmail } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const { email, username, secretPasscode } = await req.json();

        if (!email || !username || !secretPasscode) {
            return NextResponse.json({ message: "Email, username, and secret passcode are required" }, { status: 400 });
        }

        // Validate secret passcode first
        const ADMIN_CREATION_SECRET = process.env.ADMIN_CREATION_SECRET || "CARD_HIVE_ADMIN_2026";
        if (secretPasscode !== ADMIN_CREATION_SECRET) {
            return NextResponse.json(
                { message: "Invalid secret passcode." },
                { status: 403 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }],
            },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: "Username or email already exists" },
                { status: 400 }
            );
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // Expiration time: 10 minutes from now
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Upsert into DB
        await prisma.registrationOTP.upsert({
            where: { email },
            update: { otp, expiresAt },
            create: { email, otp, expiresAt },
        });

        // Send Email
        await sendOTPEmail(email, otp);

        // Dev logging
        console.log(`[DEV] Admin Registration OTP for ${email}: ${otp}`);

        return NextResponse.json({ message: "Verification code sent to email" }, { status: 200 });

    } catch (error) {
        console.error("Admin OTP generation error:", error);
        return NextResponse.json(
            { message: "Failed to send verification code" },
            { status: 500 }
        );
    }
}
