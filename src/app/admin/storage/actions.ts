"use server";

import { list, del } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getStorageImages() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    try {
        const { blobs } = await list();
        return blobs.map((blob) => ({
            url: blob.url,
            pathname: blob.pathname,
            size: blob.size,
            uploadedAt: blob.uploadedAt.toISOString(),
        }));
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
        await del(urls);
        revalidatePath("/admin/storage");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete blobs", error);
        return { success: false, error: "Failed to delete from storage" };
    }
}
