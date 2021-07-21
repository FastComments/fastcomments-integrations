const {FastCommentsCoreExampleUsage} = require('./../example/FastCommentsIntegrationCoreExample');

(async function testStepFourSyncFromRemote() {
    const myApp = new FastCommentsCoreExampleUsage();

    // pull our testing events, and then see that they get synced locally.
    await new Promise((resolve) => {
        const startTime = Date.now();
        async function tick() {
            if (Date.now() - startTime > 30 * 1000) {
                throw new Error('Sync taking too long!');
            }
            await myApp.cron();
            const isSyncDone = Object.keys(myApp.fastComments.commentDB.getData()).length > 3;
            if (isSyncDone) {
                // TODO assert data
                resolve();
            } else {
                setTimeout(tick, 1000);
            }
        }

        tick();
    });

    process.exit(0);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
