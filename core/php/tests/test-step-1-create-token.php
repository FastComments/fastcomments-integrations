<?php

echo __DIR__ . '/../example/FastCommentsIntegrationCoreExample.php';
require(__DIR__ . '/../example/FastCommentsIntegrationCoreExample.php');

$myApp = new FastCommentsCoreExampleUsage();
$myApp->fastComments->dropDatabase();
assert($myApp->fastComments->getSettingValue('fastcomments_token') === null, 'Should not have a token at this point.');
assert($myApp->fastComments->getSettingValue('fastcomments_setup') === null, 'Should not be setup yet.');
$myApp->createToken();
