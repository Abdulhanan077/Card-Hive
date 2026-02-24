"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveSettings(formData: FormData) {
    const data: any = {};

    const fields = ["siteName", "contactEmail", "whatsappNumber", "landingPageIntroText"];
    fields.forEach(field => {
        const val = formData.get(field);
        if (val !== null) {
            data[field] = val as string;
        }
    });


    const refBonusStr = formData.get("referralBonusPercentage") as string;
    if (refBonusStr) {
        data.referralBonusPercentage = parseFloat(refBonusStr);
    }

    const rewardPtsGhsStr = formData.get("rewardPointsToGhs") as string;
    if (rewardPtsGhsStr) {
        data.rewardPointsToGhs = parseFloat(rewardPtsGhsStr);
    }

    const existingSettings = await prisma.settings.findFirst();

    if (existingSettings) {
        await prisma.settings.update({
            where: { id: existingSettings.id },
            data
        });
    } else {
        await prisma.settings.create({ data });
    }

    revalidatePath("/admin/settings");
    revalidatePath("/");

    return { success: true };
}
