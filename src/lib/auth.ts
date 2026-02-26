import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
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
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }

                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { username: credentials.username },
                            { email: credentials.username },
                        ],
                    },
                });

                if (!user) {
                    throw new Error("Invalid username or password");
                }

                if (user.status === "BLOCKED") {
                    throw new Error("Your account has been deactivated. Please contact support.");
                }

                if (!user.emailVerified) {
                    throw new Error("Please verify your email address before logging in.");
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    return null;
                }

                // Verify login portal segregation
                // The frontend will pass "isAdminLogin": "true" for the admin portal.
                const isAdminLogin = (credentials as any).isAdminLogin === "true";
                // If it's an admin login portal, only allow admins
                if (isAdminLogin && user.role !== "ADMIN") return null;
                // If it's a standard login portal, only allow users
                if (!isAdminLogin && user.role !== "USER") return null;

                return {
                    id: user.id.toString(),
                    username: user.username,
                    email: user.email,
                    role: user.role,
                };
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
};
