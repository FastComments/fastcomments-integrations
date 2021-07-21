const {FastCommentsCoreExampleUsage} = require('./../example/FastCommentsIntegrationCoreExample');

(async function testStepTwoSetTenantId() {
    const myApp = new FastCommentsCoreExampleUsage();

    // This promise resolves once the app says setup is done, and the user has successfully confirmed the integration (by keeping the above page open).
    await myApp.waitForTenantId();

    process.exit(0);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
