"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addOrUpdateRateAction(cardBrand: string, cardCountry: string, cardType: string, rate: number, publicRate?: number) {
    if (!cardBrand || !cardCountry || !cardType || isNaN(rate)) {
        throw new Error("Invalid rate configuration provided.");
    }

    // Use raw SQL to bypass Prisma Client's internal validation of fields
    await prisma.$executeRaw`
        INSERT INTO "CardRate" ("cardBrand", "cardCountry", "cardType", "rate", "publicRate", "updatedAt")
        VALUES (${cardBrand}, ${cardCountry}, ${cardType}, ${rate}, ${publicRate ?? null}, NOW())
        ON CONFLICT ("cardBrand", "cardCountry", "cardType")
        DO UPDATE SET
            "rate" = EXCLUDED."rate",
            "publicRate" = EXCLUDED."publicRate",
            "updatedAt" = EXCLUDED."updatedAt"
    `;

    revalidatePath("/admin/rates");
    revalidatePath("/user/sell");
    revalidatePath("/rates");
}

export async function deleteRateAction(id: number) {
    await prisma.cardRate.delete({ where: { id } });
    revalidatePath("/admin/rates");
    revalidatePath("/user/sell");
    revalidatePath("/rates");
}

export async function bulkAddOrUpdateRatesAction(brands: string[], cardCountry: string, cardType: string, rate: number, publicRate?: number) {
    if (!brands || brands.length === 0 || !cardCountry || !cardType || isNaN(rate)) {
        throw new Error("Invalid bulk rate configuration provided.");
    }

    const upsertPromises = brands.map(brand =>
        prisma.$executeRaw`
            INSERT INTO "CardRate" ("cardBrand", "cardCountry", "cardType", "rate", "publicRate", "updatedAt")
            VALUES (${brand}, ${cardCountry}, ${cardType}, ${rate}, ${publicRate ?? null}, NOW())
            ON CONFLICT ("cardBrand", "cardCountry", "cardType")
            DO UPDATE SET
                "rate" = EXCLUDED."rate",
                "publicRate" = EXCLUDED."publicRate",
                "updatedAt" = EXCLUDED."updatedAt"
        `
    );

    // Execute all upserts in a transaction
    await prisma.$transaction(upsertPromises);

    revalidatePath("/admin/rates");
    revalidatePath("/user/sell");
    revalidatePath("/rates");
}

export async function deleteAllRatesAction() {
    await prisma.cardRate.deleteMany();
    revalidatePath("/admin/rates");
    revalidatePath("/user/sell");
    revalidatePath("/rates");
}
