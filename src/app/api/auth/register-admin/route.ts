import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { username, email, phoneNumber, password, secretPasscode } = await req.json();

        // Use environment variable for the admin creation secret, fallback to a secure default if not set
        const ADMIN_CREATION_SECRET = process.env.ADMIN_CREATION_SECRET || "CARD_HIVE_ADMIN_2026";

        if (!username || !email || !phoneNumber || !password || !secretPasscode) {
            return NextResponse.json(
                { message: "All fields are required" },
                { status: 400 }
            );
        }

        if (secretPasscode !== ADMIN_CREATION_SECRET) {
            return NextResponse.json(
                { message: "Invalid secret passcode for creating an admin." },
                { status: 403 }
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

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                username,
                email,
                phoneNumber,
                password: hashedPassword,
                role: "ADMIN",
            },
        });

        return NextResponse.json(
            { message: "Admin registration successful" },
            { status: 201 }
        );
    } catch (error) {
        console.error("Admin Registration error:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
