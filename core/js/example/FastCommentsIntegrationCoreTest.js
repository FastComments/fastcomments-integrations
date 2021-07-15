const { FastCommentsCoreExampleUsage } = require ('./FastCommentsIntegrationCoreExample');
const puppeteer = require('puppeteer');
const HOST = process.env.FC_HOST || 'https://fastcomments.com';

// TODO abstract puppeteer part into a test harness, and split test steps into something framework can invoke regardless of language.

(async function mainTest() {
    const myApp = new FastCommentsCoreExampleUsage();
    console.assert(!(await myApp.fastComments.getSettingValue('fastcomments_token')), 'No token yet.');
    console.assert(!(await myApp.fastComments.getSettingValue('fastcomments_setup')), 'Not yet setup.');

    const browser = await puppeteer.launch({
        headless: true
    });

    const tenantName = `js-core-integration-test-${Math.random()}`.replace('.', '_');

    // create a tenant to test with
    const page = await browser.newPage();
    await page.goto(`${HOST}/auth/tenant-signup`);
    await page.waitForSelector('form');
    await page.focus('input[name="username"]');
    await page.keyboard.type(tenantName);
    await page.focus('input[name="email"]');
    await page.keyboard.type(`${tenantName}@fctest.com`); // We won't send emails to @fctest
    await page.click('button[type="submit"]');
    await page.waitForSelector('body');

    // let's create some testing data locally.

    async function tryToValidateToken() {
        const token = await myApp.fastComments.getSettingValue('fastcomments_token');
        if (token) { // startSetupPoll event loop set a token
            await page.goto(`${HOST}/my-account/integrations/v1/setup?token=${token}`);
            await page.waitForSelector('token-found');
            return; // done
        }
        setTimeout(tryToValidateToken, 1000);
    }

    // This promise resolves once the app says setup is done, and the user has successfully confirmed the integration
    await new Promise.all([
        myApp.startSetupPoll(), // start the setup flow
        tryToValidateToken(), // have the admin user visit the page to setup the integration
    ]);

    // Now we should sync our local testing data (comments) to the FastComments backend.
    

    // Add some events via FastComments (add comments, remove some, update some, add some votes, undo those votes), and then see that they get synced locally.

    // delete our testing tenant
})();
