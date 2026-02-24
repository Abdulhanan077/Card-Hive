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
        const { blobs } = await list();
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const validUrlsToDelete = urls.filter(url => {
            const blob = blobs.find(b => b.url === url);
            if (!blob) return false;
            return new Date(blob.uploadedAt) <= threeDaysAgo;
        });

        if (validUrlsToDelete.length === 0) {
            return { success: false, error: "None of the selected images are 3 days old yet. Deletion rejected." };
        }

        await del(validUrlsToDelete);
        revalidatePath("/admin/storage");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete blobs", error);
        return { success: false, error: "Failed to delete from storage" };
    }
}
