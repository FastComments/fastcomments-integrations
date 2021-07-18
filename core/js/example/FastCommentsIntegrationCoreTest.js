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
    await page.waitForSelector('form');
    await page.focus('input[name="username"]');
    await page.keyboard.type(tenantName);
    await page.focus('input[name="email"]');
    await page.keyboard.type(`${tenantName}@fctest.com`); // We won't send emails to @fctest
    await page.click('button[type="submit"]');
    await page.waitForSelector('body');

    // TODO add some testing events to the account (add comments, remove some, update some, add some votes, undo those votes).

    try {
        // TODO create some testing comments locally.

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

        // send our local testing data (comments) to the FastComments backend.
        async function syncToFastComments() {
            return new Promise((resolve) => {
                async function tick() {
                    await myApp.cron();
                    const isSyncDone = await page.$eval('.log-complete', () => true).catch(() => false);
                    if (isSyncDone) {
                        resolve();
                    } else {
                        setTimeout(tick, 1000);
                    }
                }
                tick();
            });
        }

        await syncToFastComments();

        // pull our testing events, and then see that they get synced locally.
        async function syncFromFastComments() {
            return new Promise((resolve) => {
                async function tick() {
                    await myApp.cron();
                    const isSyncDone = Object.keys(myApp.fastComments.commentDB).length > 2;
                    if (isSyncDone) {
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
    }

    // delete our testing tenant via hitting safe endpoint via puppeteer


    // TODO have tenant deletion delete integration related stuff
})();
