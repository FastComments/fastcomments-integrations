<?php

echo __DIR__ . '/../example/FastCommentsIntegrationCoreExample.php';
require(__DIR__ . '/../example/FastCommentsIntegrationCoreExample.php');

$myApp = new FastCommentsCoreExampleUsage();
$myApp->waitForTenantId();
