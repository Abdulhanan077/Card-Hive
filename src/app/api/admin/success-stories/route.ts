import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const image = formData.get("image") as File;
        const caption = formData.get("caption") as string || "";

        if (!image) {
            return NextResponse.json({ message: "Image is required" }, { status: 400 });
        }

        // Upload to R2
        const uniqueName = `success-${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.]/g, "")}`;
        const buffer = Buffer.from(await image.arrayBuffer());

        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
            Key: uniqueName,
            Body: buffer,
            ContentType: image.type,
        }));

        const imageUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${uniqueName}`;

        // Set expiration to 24 hours from now
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const story = await prisma.successStory.create({
            data: {
                imageUrl,
                caption,
                expiresAt,
            },
        });

        return NextResponse.json({ story }, { status: 201 });
    } catch (error) {
        console.error("Error creating success story:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ message: "ID is required" }, { status: 400 });
        }

        const story = await prisma.successStory.findUnique({
            where: { id: parseInt(id) },
        });

        if (!story) {
            return NextResponse.json({ message: "Story not found" }, { status: 404 });
        }

        // Extract key from URL to delete from R2
        const key = story.imageUrl.split("/").pop();
        if (key) {
            try {
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
                    Key: key,
                }));
            } catch (err) {
                console.warn("Failed to delete image from R2:", err);
            }
        }

        await prisma.successStory.delete({
            where: { id: parseInt(id) },
        });

        return NextResponse.json({ message: "Success story deleted" });
    } catch (error) {
        console.error("Error deleting success story:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
