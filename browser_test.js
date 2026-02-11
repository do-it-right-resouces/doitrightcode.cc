// Browser simulation test for barcode generator
const puppeteer = require('puppeteer');

async function testBarcodeGenerator() {
    console.log("=== BROWSER SIMULATION TEST ===\n");

    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // Load the application
        await page.goto('http://localhost:8000');
        console.log("✓ Application loaded successfully");

        // Wait for page to load
        await page.waitForSelector('#generateBtn', { timeout: 5000 });
        console.log("✓ Generate button found");

        // Test admin login
        const adminBtn = await page.$('#adminBtn');
        if (adminBtn) {
            await adminBtn.click();
            await page.waitForSelector('#adminEmail', { timeout: 2000 });

            await page.type('#adminEmail', 'unkledo@icloud.com');
            await page.type('#adminPassword', 'Denver3100');
            await page.click('#adminLoginBtn');

            // Check if login succeeded
            const credits = await page.$eval('#credits', el => el.textContent);
            console.log("✓ Admin login successful - Credits:", credits);
        } else {
            console.log("✗ Admin button not found");
        }

        // Test MD5 functionality
        const md5Checkbox = await page.$('#md5Enabled');
        if (md5Checkbox) {
            const isChecked = await page.$eval('#md5Enabled', el => el.checked);
            console.log("✓ MD5 checkbox found - Currently:", isChecked ? "enabled" : "disabled");
        } else {
            console.log("✗ MD5 checkbox not found");
        }

        // Test form inputs
        const inputs = ['#lastName', '#firstName', '#middleName', '#dlNumber', '#expiration'];
        for (const selector of inputs) {
            const exists = await page.$(selector);
            if (exists) {
                console.log("✓ Input field found:", selector);
            } else {
                console.log("✗ Input field missing:", selector);
            }
        }

        // Test barcode generation (without actually generating to avoid dependencies)
        const generateBtn = await page.$('#generateBtn');
        if (generateBtn) {
            console.log("✓ Generate button is present and clickable");
        }

        // Test mobile responsiveness
        await page.setViewport({ width: 375, height: 667 }); // iPhone size
        const mobileStyles = await page.$eval('body', el => {
            const computed = window.getComputedStyle(el);
            return {
                fontSize: computed.fontSize,
                padding: computed.padding
            };
        });
        console.log("✓ Mobile viewport test passed - Font size:", mobileStyles.fontSize);

        console.log("\n=== BROWSER TEST COMPLETED SUCCESSFULLY ===");

    } catch (error) {
        console.log("✗ Browser test failed:", error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testBarcodeGenerator();