import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { email, otp, newPassword } = await req.json();

        if (!email || !otp || !newPassword) {
            return NextResponse.json(
                { message: "Email, code, and new password are required" },
                { status: 400 }
            );
        }

        // Verify the OTP
        const otpRecord = await prisma.passwordResetOTP.findUnique({
            where: { email },
        });

        if (!otpRecord) {
            return NextResponse.json(
                { message: "No reset request found or code has already been used." },
                { status: 400 }
            );
        }

        if (otpRecord.otp !== otp) {
            return NextResponse.json(
                { message: "Invalid reset code." },
                { status: 400 }
            );
        }

        if (new Date() > otpRecord.expiresAt) {
            return NextResponse.json(
                { message: "Reset code has expired. Please request a new one." },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password and mark as verified
        await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                emailVerified: new Date(), // OTP verification proves ownership
            },
        });

        // Delete the used OTP record
        await prisma.passwordResetOTP.delete({
            where: { email },
        });

        return NextResponse.json(
            { message: "Password reset successful. You can now log in with your new password." },
            { status: 200 }
        );
    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
