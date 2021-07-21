const {FastCommentsCoreExampleUsage} = require('./../example/FastCommentsIntegrationCoreExample');

(async function testStepOneCreateToken() {
    const myApp = new FastCommentsCoreExampleUsage();
    myApp.fastComments.dropDatabase();
    console.assert(!(await myApp.fastComments.getSettingValue('fastcomments_token')), 'No token yet.');
    console.assert(!(await myApp.fastComments.getSettingValue('fastcomments_setup')), 'Not yet setup.');
    await myApp.createToken();

    process.exit(0);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
