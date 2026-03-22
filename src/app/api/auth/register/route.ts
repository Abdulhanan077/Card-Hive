import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendWelcomeEmail, sendAdminNewUserEmail } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const { username, email, phoneNumber, password, ref, otp } = await req.json();

        if (!username || !email || !phoneNumber || !password || !otp) {
            return NextResponse.json(
                { message: "All fields including OTP are required" },
                { status: 400 }
            );
        }

        // Verify the OTP
        const otpRecord = await prisma.registrationOTP.findUnique({
            where: { email },
        });

        if (!otpRecord) {
            return NextResponse.json(
                { message: "No verification code found. Please request a new one." },
                { status: 400 }
            );
        }

        if (otpRecord.otp !== otp) {
            return NextResponse.json(
                { message: "Invalid verification code." },
                { status: 400 }
            );
        }

        if (new Date() > otpRecord.expiresAt) {
            return NextResponse.json(
                { message: "Verification code has expired. Please request a new one." },
                { status: 400 }
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

        // Check for valid referrer
        let referredById = null;
        if (ref) {
            const referrer = await prisma.user.findUnique({
                where: { referralCode: ref }
            });
            if (referrer) {
                referredById = referrer.id;
            }
        }

        // Generate a unique referral code
        let referralCode = username.substring(0, 4).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        // Check collision just in case
        let collision = await prisma.user.findUnique({ where: { referralCode } });
        while (collision) {
            referralCode = username.substring(0, 4).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
            collision = await prisma.user.findUnique({ where: { referralCode } });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Determine the user role based on whether this is the very first user
        const userCount = await prisma.user.count();
        const role = userCount === 0 ? "ADMIN" : "USER";

        // Create user and update referrer in a transaction
        const newUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    username,
                    email,
                    phoneNumber,
                    password: hashedPassword,
                    role,
                    referralCode,
                    emailVerified: new Date(),
                    rewardBalance: referredById ? 5 : 0, // Referee gets 5 pts if referred
                    ...(referredById && { referredBy: referredById })
                },
            });

            // Referrer gets 10 pts
            if (referredById) {
                await tx.user.update({
                    where: { id: referredById },
                    data: { rewardBalance: { increment: 10 } }
                });
            }

            return user;
        });

        // Delete the used OTP record
        await prisma.registrationOTP.delete({
            where: { email },
        });

        if (newUser.emailNotificationsEnabled) {
            await sendWelcomeEmail({ email: newUser.email, username: newUser.username }); // Await for reliability
        }
        await sendAdminNewUserEmail(newUser); // Await admin alert

        return NextResponse.json(
            { message: "Registration successful. You can now log in." },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
