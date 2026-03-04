const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const fetch = require("node-fetch");

async function debugZeptoMail() {
    const fullToken = process.env.ZEPTOMAIL_API_KEY;
    const rawToken = fullToken.replace("Zoho-enczapikey ", "");
    const fromEmail = process.env.EMAIL_FROM;

    console.log("--- Raw Token ZeptoMail Debugging ---");

    const body = {
        from: { address: fromEmail, name: "Card Hive Test" },
        to: [{ email_address: { address: "abdulhananu077@gmail.com", name: "Abdulhanan" } }],
        subject: "Raw Token Test",
        htmlbody: "Testing raw token",
    };

    try {
        const response = await fetch("https://api.zeptomail.com/v1.1/email", {
            method: "POST",
            headers: {
                "Authorization": rawToken,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        console.log("Status:", response.status);
        const data = await response.json();
        console.log("Data:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

debugZeptoMail();
