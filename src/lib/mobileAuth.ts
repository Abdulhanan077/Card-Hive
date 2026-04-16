import { decode } from "next-auth/jwt";

export async function verifyMobileToken(token: string) {
    try {
        const secret = process.env.NEXTAUTH_SECRET;
        if (!secret) {
            console.error("verifyMobileToken: NEXTAUTH_SECRET not found");
            return null;
        }

        const decoded = await decode({
            token,
            secret,
        });

        if (!decoded || !decoded.id) {
            return null;
        }

        return {
            id: decoded.id as string,
            username: decoded.username as string,
            role: decoded.role as string,
        };
    } catch (error) {
        console.error("verifyMobileToken error:", error);
        return null;
    }
}
