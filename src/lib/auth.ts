import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { UAParser } from "ua-parser-js";
import { headers } from "next/headers";
import { LoginPortal } from "@prisma/client";

export const authOptions: NextAuthOptions = {
    // adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username or Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                try {
                    if (!credentials?.username || !credentials?.password) {
                        return null;
                    }

                    const isAdminLogin = (credentials as any).isAdminLogin === "true";
                    const portal = isAdminLogin ? LoginPortal.ADMIN : LoginPortal.USER;

                    const headerList = await headers();
                    let ip = headerList.get("x-forwarded-for")?.split(',')[0] || headerList.get("x-real-ip") || "unknown";
                    if (ip === "::1" || ip === "127.0.0.1") ip = "127.0.0.1 (Localhost)";
                    const ua = headerList.get("user-agent") || "unknown";

                    const logLogin = async (success: boolean, userId?: number) => {
                        await prisma.loginEvent.create({
                            data: {
                                emailOrUsername: credentials.username,
                                portal,
                                success,
                                ipAddress: ip,
                                userAgent: ua,
                                userId,
                            }
                        }).catch((err: any) => console.error("Failed to log login event", err));
                    };

                    const user = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { username: { equals: credentials.username, mode: 'insensitive' } },
                                { email: { equals: credentials.username, mode: 'insensitive' } },
                            ],
                        },
                    });

                    if (!user) {
                        await logLogin(false);
                        throw new Error("No account found with this username or email.");
                    }

                    if (user.status === "BLOCKED") {
                        await logLogin(false, user.id);
                        throw new Error("Your account has been deactivated. Please contact support.");
                    }

                    if (!user.emailVerified) {
                        await logLogin(false, user.id);
                        throw new Error("Please verify your email address before logging in.");
                    }

                    const isPasswordValid = await bcrypt.compare(
                        credentials.password,
                        user.password
                    );

                    if (!isPasswordValid) {
                        await logLogin(false, user.id);
                        throw new Error("Incorrect password. Please try again.");
                    }

                    if (isAdminLogin && user.role !== "ADMIN") {
                        await logLogin(false, user.id);
                        throw new Error("This account does not have administrator privileges.");
                    }

                    if (!isAdminLogin && user.role !== "USER") {
                        await logLogin(false, user.id);
                        throw new Error("Administrators must log in via the Admin Portal.");
                    }

                    await logLogin(true, user.id);

                    return {
                        id: user.id.toString(),
                        username: user.username,
                        email: user.email,
                        role: user.role,
                    };
                } catch (err: any) {
                    // Log the real error for the developer
                    console.error("Login authorization error:", err);

                    // If it's one of our thrown errors, re-throw its message
                    if (err instanceof Error && !err.message.includes('Prisma') && !err.message.includes('Timed out')) {
                        throw err;
                    }

                    // Otherwise, provide a generic user-friendly message for database/internal errors
                    throw new Error("System is temporarily unavailable. Please try again later.");
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user = {
                    ...session.user,
                    id: token.id as string,
                    username: token.username as string,
                    role: token.role as string,
                };
            }
            return session;
        },
    },
    events: {
        async signIn({ user }) {
            try {
                const headerList = await headers();
                let ip = headerList.get("x-forwarded-for")?.split(',')[0] || headerList.get("x-real-ip") || "unknown";
                if (ip === "::1" || ip === "127.0.0.1") ip = "127.0.0.1 (Localhost)";
                const uaDescription = headerList.get("user-agent") || "";

                const parser = new UAParser(uaDescription);
                const browser = parser.getBrowser();
                const os = parser.getOS();
                const device = parser.getDevice();

                const deviceString = `${browser.name || "Unknown"} on ${os.name || "Unknown"} ${device.model ? `(${device.model})` : ""}`;

                await prisma.user.update({
                    where: { id: parseInt(user.id) },
                    data: {
                        lastLoginAt: new Date(),
                        lastIp: ip,
                        lastDevice: deviceString,
                    }
                });
            } catch (err) {
                console.error("Failed to update user login activity", err);
            }
        }
    }
};
