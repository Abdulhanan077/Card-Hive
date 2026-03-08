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
    const refBonus = refBonusStr ? parseFloat(refBonusStr) : undefined;

    const rewardPtsGhsStr = formData.get("rewardPointsToGhs") as string;
    const rewardPtsGhs = rewardPtsGhsStr ? parseFloat(rewardPtsGhsStr) : undefined;

    const usdtRateStr = formData.get("usdtExchangeRate") as string;
    const usdtRate = usdtRateStr ? parseFloat(usdtRateStr) : undefined;



    const existingSettings = await prisma.settings.findFirst();

    if (existingSettings) {
        if (Object.keys(data).length > 0) {
            await prisma.settings.update({
                where: { id: existingSettings.id },
                data
            });
        }

        if (usdtRate !== undefined) {
            await prisma.$executeRawUnsafe(`UPDATE "Settings" SET "usdtExchangeRate" = ${usdtRate} WHERE id = ${existingSettings.id}`);
        }
        if (refBonus !== undefined) {
            await prisma.$executeRawUnsafe(`UPDATE "Settings" SET "referralBonusPercentage" = ${refBonus} WHERE id = ${existingSettings.id}`);
        }
        if (rewardPtsGhs !== undefined) {
            await prisma.$executeRawUnsafe(`UPDATE "Settings" SET "rewardPointsToGhs" = ${rewardPtsGhs} WHERE id = ${existingSettings.id}`);
        }

    } else {
        const created = await prisma.settings.create({ data });
        if (usdtRate !== undefined) {
            await prisma.$executeRawUnsafe(`UPDATE "Settings" SET "usdtExchangeRate" = ${usdtRate} WHERE id = ${created.id}`);
        }
        if (refBonus !== undefined) {
            await prisma.$executeRawUnsafe(`UPDATE "Settings" SET "referralBonusPercentage" = ${refBonus} WHERE id = ${created.id}`);
        }
        if (rewardPtsGhs !== undefined) {
            await prisma.$executeRawUnsafe(`UPDATE "Settings" SET "rewardPointsToGhs" = ${rewardPtsGhs} WHERE id = ${created.id}`);
        }
    }

    revalidatePath("/admin/settings");
    revalidatePath("/rates");
    revalidatePath("/user/sell");
    revalidatePath("/");

    return { success: true };
}
