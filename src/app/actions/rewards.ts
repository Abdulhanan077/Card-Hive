"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function submitRewardRedemptionAction(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const userId = parseInt(session.user.id);
    const pointsToRedeem = parseFloat(formData.get("points") as string);
    const payoutMethod = formData.get("payoutMethod") as string;
    const payoutDetails = formData.get("payoutDetails") as string;

    if (!pointsToRedeem || isNaN(pointsToRedeem) || pointsToRedeem <= 0) {
        throw new Error("Invalid points amount");
    }

    // Verify withdrawal constraints
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    if (pointsToRedeem < 100) {
        throw new Error("Minimum withdrawal amount is 100 points.");
    }

    if (user.rewardBalance < pointsToRedeem) {
        throw new Error("Insufficient reward balance.");
    }

    if (user.completedTradesCount < 5) {
        throw new Error("You must complete at least 5 successful trades before withdrawing rewards.");
    }

    // Wrap in a transaction to deduct points and create request
    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { rewardBalance: { decrement: pointsToRedeem } }
        }),
        prisma.rewardRedemption.create({
            data: {
                userId,
                pointsRedeemed: pointsToRedeem,
                payoutMethod,
                payoutDetails,
                status: "PENDING"
            }
        })
    ]);

    revalidatePath("/user");
    revalidatePath("/user/rewards");
    revalidatePath("/admin/rewards"); // for admin later

    return { success: true };
}
