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
                            { username: { equals: credentials.username, mode: 'insensitive' } },
                            { email: { equals: credentials.username, mode: 'insensitive' } },
                        ],
                    },
                });

                if (!user) {
                    throw new Error("No account found with this username or email.");
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
                    throw new Error("Incorrect password. Please try again.");
                }

                // Verify login portal segregation
                const isAdminLogin = (credentials as any).isAdminLogin === "true";

                if (isAdminLogin && user.role !== "ADMIN") {
                    throw new Error("This account does not have administrator privileges.");
                }

                if (!isAdminLogin && user.role !== "USER") {
                    throw new Error("Administrators must log in via the Admin Portal.");
                }

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
