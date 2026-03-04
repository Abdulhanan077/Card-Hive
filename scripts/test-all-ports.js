const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

async function testPort(port, secure) {
    console.log(`\n--- Testing SMTP Port ${port} (Secure: ${secure}) ---`);

    const transporter = nodemailer.createTransport({
        host: "smtp.zeptomail.com",
        port: port,
        secure: secure,
        auth: {
            user: "emailapikey",
            pass: process.env.ZEPTOMAIL_SMTP_PASS,
        },
        connectionTimeout: 10000,
    });

    try {
        const info = await transporter.sendMail({
            from: `"Card Hive" <${process.env.EMAIL_FROM}>`,
            to: "abdulhananu077@gmail.com",
            subject: `SMTP Test Port ${port}`,
            html: `<p>Test success on port ${port}</p>`,
        });
        console.log(`✅ SUCCESS on port ${port}:`, info.messageId);
        return true;
    } catch (err) {
        console.error(`❌ FAILED on port ${port}:`, err.message);
        return false;
    }
}

async function runTests() {
    const p465 = await testPort(465, true);
    if (p465) return;
    await testPort(587, false);
}

runTests();
