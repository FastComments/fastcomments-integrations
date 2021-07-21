<?php

require(__DIR__ . '/../example/FastCommentsIntegrationCoreExample.php');

$myApp = new FastCommentsCoreExampleUsage();

$startTime = time();
$isSyncDone = false;
while(!$isSyncDone) {
    if (time() - $startTime > 30) {
        throw new RuntimeException('Sync taking too long!');
    }
    $myApp->cron();
    $isSyncDone = count(array_keys($myApp->fastComments->commentDB->getData())) > 3;
    sleep(1);
}
