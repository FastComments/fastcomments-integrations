const {FastCommentsCoreExampleUsage} = require('./../example/FastCommentsIntegrationCoreExample');

(async function testStepOneGetToken() {
    const myApp = new FastCommentsCoreExampleUsage();
    console.log(await myApp.fastComments.getSettingValue('fastcomments_token'));
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
