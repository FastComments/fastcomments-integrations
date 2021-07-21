<?php

require(__DIR__ . '/../example/FastCommentsIntegrationCoreExample.php');

$myApp = new FastCommentsCoreExampleUsage();

$myApp->fastComments->commentDB->setValue('external-id-0', array(
    "urlId" => "test",
    "url" => "https://example.com",
    "pageTitle" => "Some test page title",
    "userId" => "some-user",
    "commenterName" => "Commenter name",
    "commenterEmail" => "someone@fctest.com",
    "comment" => "Automation Test 1",
    "commentHTML" => "<b>Automation Test 1</b>",
    "date" => "2021-07-18T22:03:41.275Z",
    "votes" => 1,
    "votesUp" => 1,
    "votesDown" => 0,
    "verified" => true,
    "verifiedDate" => "2021-07-18T22:03:41.275Z",
    "notificationSentForParent" => true,
    "notificationSentForParentTenant" => true,
    "reviewed" => true,
    "imported" => true,
    "externalId" => "external-id-0",
    "externalParentId" => null,
    "isSpam" => false,
    "avatarSrc" => "https://static.fastcomments.com/1605337537848-DSC_0841.JPG",
    "hasImages" => false,
    "hasLinks" => false,
    "approved" => true
));

$myApp->fastComments->commentDB->setValue('external-id-1', array(
    "urlId" => "test",
    "url" => "https://example.com",
    "pageTitle" => "Some test page title",
    "userId" => "some-user",
    "commenterName" => "Commenter name",
    "commenterEmail" => "someone@fctest.com",
    "comment" => "Automation Test 2",
    "commentHTML" => "<b>Automation Test 2</b>",
    "date" => "2021-07-18T22:03:41.275Z",
    "votes" => 1,
    "votesUp" => 1,
    "votesDown" => 0,
    "verified" => true,
    "verifiedDate" => "2021-07-18T22:03:41.275Z",
    "notificationSentForParent" => true,
    "notificationSentForParentTenant" => true,
    "reviewed" => true,
    "imported" => true,
    "externalId" => "external-id-1",
    "externalParentId" => "external-id-0",
    "isSpam" => false,
    "avatarSrc" => "https://static.fastcomments.com/1605337537848-DSC_0841.JPG",
    "hasImages" => false,
    "hasLinks" => false,
    "approved" => true
));

$startTime = time();
$isSyncDone = false;
while(!$isSyncDone) {
    if (time() - $startTime > 30) {
        throw new RuntimeException('Sync taking too long!');
    }
    $myApp->cron();
    $isSyncDone = $myApp->fastComments->getSettingValue('fastcomments_sync_completed');
    sleep(1);
}
