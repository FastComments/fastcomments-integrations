<?php

echo __DIR__ . '/../example/FastCommentsIntegrationCoreExample.php';
require(__DIR__ . '/../example/FastCommentsIntegrationCoreExample.php');

$myApp = new FastCommentsCoreExampleUsage();
echo $myApp->fastComments->getSettingValue('fastcomments_token');
