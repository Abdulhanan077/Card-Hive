"use server";

import { list as listVercel, del as delVercel } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
});

export async function getStorageImages() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    try {
        let allImages: any[] = [];

        // 1. Fetch from Vercel
        try {
            const { blobs } = await listVercel();
            const vercelImages = blobs.map((blob) => ({
                url: blob.url,
                pathname: blob.pathname,
                size: blob.size,
                uploadedAt: blob.uploadedAt.toISOString(),
            }));
            allImages = [...allImages, ...vercelImages];
        } catch (e) { console.error("Error fetching Vercel Blobs", e) }

        // 2. Fetch from Cloudflare R2
        try {
            const command = new ListObjectsV2Command({
                Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
            });
            const r2Data = await s3Client.send(command);

            if (r2Data.Contents) {
                const r2Images = r2Data.Contents.map((obj) => ({
                    url: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${obj.Key}`,
                    pathname: obj.Key || "",
                    size: obj.Size || 0,
                    uploadedAt: obj.LastModified ? obj.LastModified.toISOString() : new Date().toISOString(),
                }));
                allImages = [...allImages, ...r2Images];
            }
        } catch (e) { console.error("Error fetching R2 Blobs", e) }

        return allImages;
    } catch (error) {
        console.error("Failed to list blobs", error);
        return [];
    }
}

export async function deleteStorageImages(urls: string[]) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    if (!urls || urls.length === 0) return { success: true };

    try {
        // We have to inspect the list of everything to verify dates again
        const allSystemBlobs = await getStorageImages();
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const validUrlsToDelete = urls.filter(url => {
            const blob = allSystemBlobs.find(b => b.url === url);
            if (!blob) return false;
            return new Date(blob.uploadedAt) <= threeDaysAgo;
        });

        if (validUrlsToDelete.length === 0) {
            return { success: false, error: "None of the selected images are 3 days old yet. Deletion rejected." };
        }

        // Split URLs into Vercel requests vs R2 requests based on domain structure
        const vercelUrls = validUrlsToDelete.filter(url => url.includes("public.blob.vercel-storage.com"));
        const r2Urls = validUrlsToDelete.filter(url => url.includes(process.env.CLOUDFLARE_R2_PUBLIC_URL || ""));

        // Delete from Vercel
        if (vercelUrls.length > 0) {
            await delVercel(vercelUrls);
        }

        // Delete from R2
        if (r2Urls.length > 0) {
            const objectsToDelete = r2Urls.map(url => {
                // Key is whatever comes after the public URL
                const key = url.replace(`${process.env.CLOUDFLARE_R2_PUBLIC_URL}/`, "");
                return { Key: key };
            });

            const deleteCommand = new DeleteObjectsCommand({
                Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
                Delete: {
                    Objects: objectsToDelete,
                    Quiet: false,
                },
            });
            await s3Client.send(deleteCommand);
        }

        revalidatePath("/admin/storage");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete blobs", error);
        return { success: false, error: "Failed to delete from storage" };
    }
}
