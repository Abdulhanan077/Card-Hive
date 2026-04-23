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
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            password: true,
                            role: true,
                            status: true,
                            emailVerified: true,
                            theme: true,
                        }
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
                        theme: user.theme,
                    };
                } catch (err: any) {
                    // Log the real error for the developer
                    console.error("Login authorization error:", err);

                    // Check for database connectivity issues specifically (Neon, timeouts, etc.)
                    const isPrismaError = err?.message?.includes('Prisma') || err?.code?.startsWith('P');
                    const isTimeout = err?.message?.includes('Timed out') || err?.message?.includes('timeout') || err?.code === 'P1002' || err?.code === 'P1008';

                    if (isPrismaError || isTimeout) {
                        console.error("DEBUG: Database connectivity issue detected during login.");
                        throw new Error("System is temporarily unable to reach the database. Please try again shortly.");
                    }

                    // If it's one of our thrown errors, re-throw its message
                    if (err instanceof Error) {
                        throw err;
                    }

                    // Otherwise, provide a generic user-friendly message for internal errors
                    throw new Error("An unexpected login error occurred. Please try again later.");
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.role = user.role;
                token.theme = (user as any).theme;
                token.status = (user as any).status;
            }

            // Periodically re-verify status from DB to enforce administrative blocks
            // This ensures that even if a user is already logged in, they will be 
            // locked out once their status is changed to BLOCKED in the database.
            if (token?.id) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: parseInt(token.id as string) },
                    select: { status: true }
                });
                
                if (!dbUser || dbUser.status === 'BLOCKED' || dbUser.status === 'DELETED') {
                    // Return null or an invalid token to clear the session
                    return null as any;
                }
            }

            // Handle manual session updates (e.g., theme toggle)
            if (trigger === "update" && session?.theme) {
                token.theme = session.theme;
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
                    theme: token.theme as string,
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
