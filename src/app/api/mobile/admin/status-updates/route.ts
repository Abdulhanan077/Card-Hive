import { NextResponse } from "next/server";
import { verifyMobileToken } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
});

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        const token = authHeader?.split(" ")[1];
        if (!token) return NextResponse.json({ message: "No token provided" }, { status: 401 });

        const user = await verifyMobileToken(token);
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const image = formData.get("image") as File | null;
        let imageUrl = null;

        const message = formData.get("message") as string;
        if (!message || message.trim() === "") {
            return NextResponse.json({ message: "Message text is required" }, { status: 400 });
        }

        if (image && image.size > 0) {
            const uniqueName = `status-${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.]/g, "")}`;
            const buffer = Buffer.from(await image.arrayBuffer());

            await s3Client.send(new PutObjectCommand({
                Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
                Key: uniqueName,
                Body: buffer,
                ContentType: image.type,
            }));

            imageUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${uniqueName}`;
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const update = await prisma.statusUpdate.create({
            data: {
                imageUrl,
                message,
                expiresAt,
            },
        });

        return NextResponse.json({ update }, { status: 201 });
    } catch (error) {
        console.error("Mobile Admin Status POST Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        const token = authHeader?.split(" ")[1];
        if (!token) return NextResponse.json({ message: "No token provided" }, { status: 401 });

        const user = await verifyMobileToken(token);
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ message: "ID is required" }, { status: 400 });

        const update = await prisma.statusUpdate.findUnique({
            where: { id: parseInt(id) },
        });

        if (!update) return NextResponse.json({ message: "Status update not found" }, { status: 404 });

        if (update.imageUrl) {
            const key = update.imageUrl.split("/").pop();
            if (key) {
                try {
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
                        Key: key,
                    }));
                } catch (err) {}
            }
        }

        await prisma.statusUpdate.delete({
            where: { id: parseInt(id) },
        });

        return NextResponse.json({ message: "Status update deleted" });
    } catch (error) {
        console.error("Mobile Admin Status DELETE Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
