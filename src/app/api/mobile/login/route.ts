import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: { equals: username, mode: 'insensitive' } },
                    { email: { equals: username, mode: 'insensitive' } },
                ],
            },
        });

        if (!user) {
            return NextResponse.json({ error: "No account found with this username or email." }, { status: 401 });
        }

        if (user.status === "BLOCKED") {
            return NextResponse.json({ error: "Your account has been deactivated. Please contact support." }, { status: 403 });
        }

        if (!user.emailVerified) {
            return NextResponse.json({ error: "Please verify your email address before logging in." }, { status: 403 });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return NextResponse.json({ error: "Incorrect password. Please try again." }, { status: 401 });
        }

        // Generate JWT token matching next-auth
        const secret = process.env.NEXTAUTH_SECRET;
        if (!secret) {
            throw new Error("NEXTAUTH_SECRET is not configured.");
        }

        const token = await encode({
            token: {
                id: user.id.toString(),
                username: user.username,
                role: user.role,
                theme: user.theme,
            },
            secret,
        });

        // Log the event
        await prisma.loginEvent.create({
            data: {
                emailOrUsername: username,
                portal: "USER",
                success: true,
                ipAddress: "Mobile App",
                userAgent: "Flutter MyCardHive",
                userId: user.id,
            }
        });

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
                lastIp: "Mobile App",
                lastDevice: "Mobile App",
            }
        });

        // Fetch lifetime stats
        const trades = await prisma.trade.findMany({
            where: { userId: user.id },
            select: {
                status: true,
                faceValue: true,
                calculatedPayout: true,
            }
        });

        const stats = {
            totalTrades: trades.length,
            pending: trades.filter(t => ['PENDING', 'UNDER_REVIEW', 'REVIEWING'].includes(t.status)).length,
            successful: trades.filter(t => ['PAID', 'COMPLETED'].includes(t.status)).length,
            rejected: trades.filter(t => t.status === 'REJECTED').length,
            totalReceivedGHS: trades.filter(t => ['PAID', 'COMPLETED'].includes(t.status)).reduce((sum, t) => sum + (t.calculatedPayout || 0), 0),
            totalVolumeUSD: trades.filter(t => ['PAID', 'COMPLETED'].includes(t.status)).reduce((sum, t) => sum + (t.faceValue || 0), 0),
        };

        const settings = await prisma.settings.findFirst({
            select: {
                siteName: true,
                contactEmail: true,
                whatsappNumber: true,
                referralBonusPercentage: true,
                rewardPointsToGhs: true,
                usdtExchangeRate: true,
                isReviewMode: true,
            }
        });

        return NextResponse.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                rewardBalance: user.rewardBalance,
                completedTradesCount: user.completedTradesCount,
                stats,
            },
            siteSettings: settings || {
                siteName: "MyCardHive",
                contactEmail: "support@mycardhive.com",
                whatsappNumber: "",
                referralBonusPercentage: 1.5,
                rewardPointsToGhs: 100.0,
                usdtExchangeRate: 15.0,
                isReviewMode: false,
            }
        }, { status: 200 });

    } catch (err: any) {
        console.error("Mobile Login API Error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
