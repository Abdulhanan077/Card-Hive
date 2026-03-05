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

    const usdtRateStr = formData.get("usdtExchangeRate") as string;
    if (usdtRateStr) {
        data.usdtExchangeRate = parseFloat(usdtRateStr);
    }

    const existingSettings = await prisma.settings.findFirst();

    if (existingSettings) {
        // Save the rate via raw SQL to bypass Prisma Client filtering out unknown fields
        const usdtRate = data.usdtExchangeRate;
        delete data.usdtExchangeRate;

        if (Object.keys(data).length > 0) {
            await prisma.settings.update({
                where: { id: existingSettings.id },
                data
            });
        }

        if (usdtRate !== undefined) {
            await prisma.$executeRawUnsafe(`UPDATE "Settings" SET "usdtExchangeRate" = ${usdtRate} WHERE id = ${existingSettings.id}`);
        }

    } else {
        const usdtRate = data.usdtExchangeRate;
        delete data.usdtExchangeRate;

        const created = await prisma.settings.create({ data });
        if (usdtRate !== undefined) {
            await prisma.$executeRawUnsafe(`UPDATE "Settings" SET "usdtExchangeRate" = ${usdtRate} WHERE id = ${created.id}`);
        }
    }

    revalidatePath("/admin/settings");
    revalidatePath("/");

    return { success: true };
}
