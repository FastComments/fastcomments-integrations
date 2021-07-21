const puppeteer = require('puppeteer');
const { join } = require('path');
const { execSync } = require('child_process');
const HOST = process.env.FC_HOST || 'https://fastcomments.com';
const { Command } = require('commander');
const program = new Command();
program.option('-l, --library <library>', 'library to test');
program.parse(process.argv);
const LIBRARY_TO_TEST = program.opts().library;

if (!LIBRARY_TO_TEST) {
    throw new Error('Specify a library to test (env LIBRARY_TO_TEST)');
}

const configuration = require('./test-definitions.json').projects[LIBRARY_TO_TEST];

if (!configuration || !configuration.stepCommands || configuration.stepCommands.length === 0) {
    throw new Error(`Could not find test configuration for LIBRARY_TO_TEST=[${LIBRARY_TO_TEST}].`);
}

const CORE_DIR = join(__dirname, '..');

function runStep(name, inheritIo) {
    const config = {
        cwd: CORE_DIR
    }
    if (inheritIo) {
        config.stdio = 'inherit';
    }
    const start = Date.now();
    console.log(`START ${name}`);
    const result = execSync(configuration.stepCommands[name].toString(), config);
    console.log(`END ${name} ${Date.now() - start}ms`);
    return result;
}

(async function mainTest() {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            // TODO fix build pipeline so this isn't needed
            '--no-sandbox',
            // TODO fix build pipeline so this isn't needed
            '--disable-setuid-sandbox',
        ]
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
        // a lot of times the token will be made even before a tenant exists.
        runStep('test-step-1-create-token', true);

        const token = runStep('test-step-1-get-token', false).toString('utf8').trim();

        console.log('Got token', token);

        if (!token) {
            throw new Error('Token could not be created and retrieved.');
        }

        // have the admin user visit the page to setup the integration
        await page.goto(`${HOST}/auth/my-account/integrations/v1/setup?token=${token}`);

        runStep('test-step-2-set-tenant-id', true);

        runStep('test-step-3-sync-to-remote', true);

        // create some testing events in our new account (add comments, remove some, update some, add some votes, undo those votes).
        await page.goto(`${HOST}/auth/my-account/integrations/v1/create-testing-events?token=${token}`);
        await page.waitForSelector('body');

        runStep('test-step-4-sync-from-remote', true);
    } catch (e) {
        console.error(e);
        // delete our testing tenant via hitting a safe endpoint
        await page.goto(`${HOST}/test-e2e/api/tenant/delete-current-tenant`);
        process.exit(1);
    }

    // delete our testing tenant via hitting a safe endpoint
    await page.goto(`${HOST}/test-e2e/api/tenant/delete-current-tenant`);
    process.exit(0);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
