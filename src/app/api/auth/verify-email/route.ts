import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.redirect(new URL("/login?error=MissingToken", req.url));
        }

        const user = await prisma.user.findUnique({
            where: { verificationToken: token },
        });

        if (!user) {
            return NextResponse.redirect(new URL("/login?error=InvalidToken", req.url));
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: new Date(),
                verificationToken: null,
            },
        });

        if (user.emailNotificationsEnabled) {
            sendWelcomeEmail({ email: user.email, username: user.username });
        }

        return NextResponse.redirect(new URL("/login?verified=true", req.url));
    } catch (error) {
        console.error("Email verification error:", error);
        return NextResponse.redirect(new URL("/login?error=VerificationFailed", req.url));
    }
}
