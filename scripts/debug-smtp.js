const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

async function debugSMTP() {
    console.log("--- SMTP Debugging ---");
    console.log("Host:", process.env.ZEPTOMAIL_SMTP_HOST);
    console.log("Port:", process.env.ZEPTOMAIL_SMTP_PORT);
    console.log("User:", process.env.ZEPTOMAIL_SMTP_USER);

    const transporter = nodemailer.createTransport({
        host: process.env.ZEPTOMAIL_SMTP_HOST,
        port: 465,
        secure: true,
        auth: {
            user: process.env.ZEPTOMAIL_SMTP_USER,
            pass: process.env.ZEPTOMAIL_SMTP_PASS,
        },
        debug: true,
        logger: true
    });

    try {
        const info = await transporter.sendMail({
            from: `"Card Hive" <${process.env.EMAIL_FROM}>`,
            to: "abdulhananu077@gmail.com",
            subject: "SMTP Debug Test",
            html: "<h1>SMTP SUCCESS</h1><p>The SMTP bridge is working!</p>",
        });
        console.log("✅ SMTP SUCCESS:", info.messageId);
    } catch (err) {
        console.error("❌ SMTP FAILED:", err);
    }
}

debugSMTP();
