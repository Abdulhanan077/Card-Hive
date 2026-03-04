import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const email = url.searchParams.get("email") || "cardhiveofficial@gmail.com";
        const username = url.searchParams.get("username") || "Card Hive Admin";

        await sendWelcomeEmail({ email, username });

        return NextResponse.json({
            success: true,
            message: `Test email initiated to ${email}. Check your server console for the ZeptoMail API response if it succeeded, or look in your inbox!`
        });
    } catch (error) {
        console.error("Test email route error:", error);
        return NextResponse.json({ success: false, error: "Failed to send test email" }, { status: 500 });
    }
}
