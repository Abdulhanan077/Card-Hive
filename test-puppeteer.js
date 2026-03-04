const puppeteer = require('puppeteer');

async function runTest() {
    console.log("Starting Puppeteer test for Confirm Receipt...");
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    // Capture console logs from the page
    page.on('console', msg => {
        // Only log useful things to avoid noise
        if (msg.text().includes('Action result') || msg.text().includes('Action exception') || msg.text().includes('ConfirmReceipt')) {
            console.log('PAGE LOG:', msg.text());
        }
    });

    try {
        // 1. Login
        console.log("Navigating to login...");
        await page.goto('http://localhost:3000/login');
        await page.type('input[name="identifier"]', 'rita');
        await page.type('input[name="password"]', 'password123');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('button[type="submit"]')
        ]);

        // 2. Go to Trades
        console.log("Navigating to trades...");
        await page.goto('http://localhost:3000/user/trades?status=PAID');

        // Wait for the button to appear
        console.log("Waiting for Confirm Receipt button...");
        await page.waitForTimeout(2000); // give it a moment to render

        const buttonExists = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.some(b => b.textContent.includes('Confirm Receipt'));
        });

        if (!buttonExists) {
            console.log("Button not found! Are there any PAID trades?");
            return;
        }

        // 3. Click and Accept Dialog
        console.log("Clicking button...");
        page.on('dialog', async dialog => {
            console.log('Dialog appeared:', dialog.message());
            await dialog.accept();
        });

        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const target = btns.find(b => b.textContent.includes('Confirm Receipt'));
            if (target) target.click();
        });

        console.log("Clicked! Waiting for action to complete...");
        await page.waitForTimeout(5000); // Wait for server action to finish

        console.log("Test finished.");
    } catch (err) {
        console.error("Puppeteer Error:", err);
    } finally {
        await browser.close();
    }
}

runTest();
