const {FastCommentsCoreExampleUsage} = require('./../example/FastCommentsIntegrationCoreExample');

(async function testStepThreeSyncToRemote() {
    const myApp = new FastCommentsCoreExampleUsage();

    myApp.fastComments.commentDB.setValue('external-id-0', {
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
    });

    myApp.fastComments.commentDB.setValue('external-id-1', {
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
    });

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
    process.exit(0);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
