<?php

require(__DIR__ . '/../example/FastCommentsIntegrationCoreExample.php');

$myApp = new FastCommentsCoreExampleUsage();
$myApp->fastComments->dropDatabase();
assert($myApp->fastComments->getSettingValue('fastcomments_token') === null, 'Should not have a token at this point.');
assert($myApp->fastComments->getSettingValue('fastcomments_setup') === null, 'Should not be setup yet.');
assert(count(array_keys($myApp->fastComments->commentDB->getData())) == 0, 'Should not have any comments yet yet.');
$myApp->createToken();
