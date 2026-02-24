"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addOrUpdateRateAction(cardBrand: string, cardCountry: string, rate: number) {
    if (!cardBrand || !cardCountry || isNaN(rate)) {
        throw new Error("Invalid rate configuration provided.");
    }

    await prisma.cardRate.upsert({
        where: {
            cardBrand_cardCountry: {
                cardBrand,
                cardCountry
            }
        },
        update: { rate },
        create: { cardBrand, cardCountry, rate }
    });

    revalidatePath("/admin/rates");
    revalidatePath("/user/sell");
}

export async function deleteRateAction(id: number) {
    await prisma.cardRate.delete({ where: { id } });
    revalidatePath("/admin/rates");
    revalidatePath("/user/sell");
}

export async function bulkAddOrUpdateRatesAction(brands: string[], cardCountry: string, rate: number) {
    if (!brands || brands.length === 0 || !cardCountry || isNaN(rate)) {
        throw new Error("Invalid bulk rate configuration provided.");
    }

    const upsertPromises = brands.map(brand =>
        prisma.cardRate.upsert({
            where: {
                cardBrand_cardCountry: {
                    cardBrand: brand,
                    cardCountry
                }
            },
            update: { rate },
            create: { cardBrand: brand, cardCountry, rate }
        })
    );

    // Execute all upserts in a transaction
    await prisma.$transaction(upsertPromises);

    revalidatePath("/admin/rates");
    revalidatePath("/user/sell");
}

export async function deleteAllRatesAction() {
    await prisma.cardRate.deleteMany();
    revalidatePath("/admin/rates");
    revalidatePath("/user/sell");
}
