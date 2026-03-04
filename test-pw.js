const { chromium } = require('playwright');

async function run() {
    console.log('Launching browser...');
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error' || msg.text().includes('Action')) {
            console.log(`BROWSER [${msg.type()}]:`, msg.text());
        }
    });

    try {
        console.log('Navigating to login...');
        await page.goto('http://localhost:3000/login');
        await page.fill('input[name="identifier"]', 'rita');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);

        console.log('Navigating to PAID trades...');
        await page.goto('http://localhost:3000/user/trades?status=PAID');
        await page.waitForTimeout(2000);

        // Accept dialogs automatically
        page.on('dialog', async dialog => {
            console.log('Dialog appeared:', dialog.message());
            await dialog.accept();
        });

        console.log('Clicking Confirm Receipt...');
        // Find button containing text "Confirm Receipt"
        const button = await page.$('button:text("Confirm Receipt")');
        if (!button) {
            console.log("No Confirm Receipt button found");
            return;
        }

        await button.click();
        console.log('Clicked. Waiting for visual debug result...');

        await page.waitForTimeout(4000);

        // Get the debug text from the DOM directly
        const html = await page.content();
        if (html.includes('error_caught')) {
            const snippet = html.substring(html.indexOf('error_caught') - 10, html.indexOf('error_caught') + 150);
            console.log('Visual Debug Output found in DOM:', snippet);
        } else {
            console.log('No error_caught found in UI. Checking for full debug string...');
            const match = html.match(/{"(success|error)":.*?}/);
            if (match) {
                console.log('Visual Debug Output found in DOM:', match[0]);
            } else {
                console.log('No debug JSON found in UI.');
            }
        }

    } catch (err) {
        console.error('Test script error:', err);
    } finally {
        await browser.close();
    }
}

run();
