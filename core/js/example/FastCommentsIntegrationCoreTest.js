const {FastCommentsCoreExampleUsage} = require('./FastCommentsIntegrationCoreExample');
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
    await page.waitForSelector('#signup-form');
    await page.focus('input[name=username]');
    await page.keyboard.type(tenantName);
    await page.focus('input[name=email]');
    await page.keyboard.type(`${tenantName}@fctest.com`); // We won't send emails to @fctest
    await page.focus('input[name=companyName]');
    await page.keyboard.type(tenantName);
    await page.focus('input[name=domains]');
    await page.keyboard.type('fastcomments.com');
    await page.click('button[type=submit]');
    await page.waitForSelector('body');
    console.assert((await page.title()) === 'FastComments - Welcome!');

    try {

        myApp.fastComments.commentDB['external-id-0'] = {
            "urlId": "test",
            "url": "https://example.com",
            "pageTitle": "Some test page title",
            "userId": "some-user",
            "commenterName": "Commenter name",
            "commenterEmail": "someone@fctest.com",
            "comment": "Automation Test 1",
            "commentHTML": "<b>Automation Test 1</b>",
            "date": "2021-07-18T22:03:41.275Z",
            "votes": 1,
            "votesUp": 1,
            "votesDown": 0,
            "verified": true,
            "verifiedDate": "2021-07-18T22:03:41.275Z",
            "notificationSentForParent": true,
            "notificationSentForParentTenant": true,
            "reviewed": true,
            "imported": true,
            "externalId": "external-id-0",
            "externalParentId": null,
            "isSpam": false,
            "avatarSrc": "https://static.fastcomments.com/1605337537848-DSC_0841.JPG",
            "hasImages": false,
            "hasLinks": false,
            "approved": true
        };

        myApp.fastComments.commentDB['external-id-1'] = {
            "urlId": "test",
            "url": "https://example.com",
            "pageTitle": "Some test page title",
            "userId": "some-user",
            "commenterName": "Commenter name",
            "commenterEmail": "someone@fctest.com",
            "comment": "Automation Test 2",
            "commentHTML": "<b>Automation Test 2</b>",
            "date": "2021-07-18T22:03:41.275Z",
            "votes": 1,
            "votesUp": 1,
            "votesDown": 0,
            "verified": true,
            "verifiedDate": "2021-07-18T22:03:41.275Z",
            "notificationSentForParent": true,
            "notificationSentForParentTenant": true,
            "reviewed": true,
            "imported": true,
            "externalId": "external-id-1",
            "externalParentId": "external-id-0",
            "isSpam": false,
            "avatarSrc": "https://static.fastcomments.com/1605337537848-DSC_0841.JPG",
            "hasImages": false,
            "hasLinks": false,
            "approved": true
        };

        await myApp.createToken();

        async function openPageToValidateToken() {
            const token = await myApp.fastComments.getSettingValue('fastcomments_token');
            await page.goto(`${HOST}/auth/my-account/integrations/v1/setup?token=${token}`);
        }

        await openPageToValidateToken(); // have the admin user visit the page to setup the integration

        // This promise resolves once the app says setup is done, and the user has successfully confirmed the integration (by keeping the above page open).
        await myApp.waitForTenantId();

        async function createTestingData() {
            const token = await myApp.fastComments.getSettingValue('fastcomments_token');
            // create some testing events in our new account (add comments, remove some, update some, add some votes, undo those votes).
            await page.goto(`${HOST}/auth/my-account/integrations/v1/create-testing-events?token=${token}`);
            await page.waitForSelector('body');
        }

        await createTestingData();

        // send our local testing data (comments) to the FastComments backend.
        async function syncToFastComments() {
            const start = Date.now();
            console.log('Sync to backend starting...');
            await new Promise((resolve) => {
                async function tick() {
                    await myApp.cron();
                    const isSyncDone = await myApp.fastComments.getSettingValue('fastcomments_sync_completed');
                    if (isSyncDone) {
                        resolve();
                    } else {
                        setTimeout(tick, 1000);
                    }
                }

                tick();
            });
            console.log(`Sync to backend done... ${Date.now() - start}ms`);
        }

        await syncToFastComments();

        // pull our testing events, and then see that they get synced locally.
        async function syncFromFastComments() {
            return new Promise((resolve) => {
                async function tick() {
                    await myApp.cron();
                    const isSyncDone = Object.keys(myApp.fastComments.commentDB).length > 3;
                    if (isSyncDone) {
                        // TODO assert data
                        resolve();
                    } else {
                        setTimeout(tick, 1000);
                    }
                }

                tick();
            });
        }

        await syncFromFastComments();

    } catch (e) {
        console.error(e);
        // delete our testing tenant via hitting a safe endpoint
        await page.goto(`${HOST}/test-e2e/api/tenant/delete-current-tenant`);
        process.exit(1);
    }

    // delete our testing tenant via hitting a safe endpoint
    await page.goto(`${HOST}/test-e2e/api/tenant/delete-current-tenant`);
    process.exit(0);
})();
