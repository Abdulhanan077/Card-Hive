import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, email, phoneNumber, password, confirmPassword, referralCode: inputRef, otp } = body;

        if (!username || !email || !phoneNumber || !password || !otp) {
            return NextResponse.json({ error: "All fields including OTP are required" }, { status: 400 });
        }

        if (password !== confirmPassword) {
            return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
        }

        // Verify OTP
        const otpRecord = await prisma.registrationOTP.findUnique({
            where: { email },
        });

        if (!otpRecord || otpRecord.otp !== otp) {
            return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
        }

        if (new Date() > otpRecord.expiresAt) {
            return NextResponse.json({ error: "Verification code has expired. Request a new one." }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: { equals: username, mode: 'insensitive' } },
                    { email: { equals: email, mode: 'insensitive' } },
                ],
            },
        });

        if (existingUser) {
            return NextResponse.json({ error: "An account with this username or email already exists." }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Map referral code to a referrer if it exists
        let referredById = null;
        if (inputRef) {
            const referrer = await prisma.user.findUnique({
                where: { referralCode: inputRef }
            });
            if (referrer) referredById = referrer.id;
        }

        // Generate a unique referral code for the NEW user
        let referralCode = username.substring(0, 4).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        let collision = await prisma.user.findUnique({ where: { referralCode }, select: { id: true }});
        while (collision) {
            referralCode = username.substring(0, 4).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
            collision = await prisma.user.findUnique({ where: { referralCode }, select: { id: true }});
        }

        // Create the user
        const user = await prisma.user.create({
            data: {
                username,
                email,
                phoneNumber,
                password: hashedPassword,
                role: "USER",
                status: "ACTIVE",
                emailVerified: new Date(), 
                referralCode,
                referredBy: referredById,
                lastIp: "Mobile App",
                lastDevice: "Mobile App Native",
            }
        });

        // Delete used OTP
        await prisma.registrationOTP.delete({ where: { email } });

        const secret = process.env.NEXTAUTH_SECRET;
        if (!secret) throw new Error("NEXTAUTH_SECRET is not configured.");

        // Automatically log them in
        const token = await encode({
            token: {
                id: user.id.toString(),
                username: user.username,
                role: user.role,
                theme: user.theme,
            },
            secret,
        });

        await prisma.loginEvent.create({
            data: {
                emailOrUsername: username,
                portal: "USER",
                success: true,
                ipAddress: "Mobile App",
                userAgent: "Flutter Signup",
                userId: user.id,
            }
        });

        return NextResponse.json({
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        }, { status: 201 });

    } catch (err: any) {
        console.error("Mobile Signup API Error:", err);
        return NextResponse.json({ error: "Internal server error during registration." }, { status: 500 });
    }
}
