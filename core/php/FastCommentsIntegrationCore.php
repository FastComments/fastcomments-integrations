<?php

abstract class FastCommentsIntegrationCore {
    public $baseUrl;
    public $integrationType;

    public function __construct($integrationType, $host = 'https://fastcomments.com') {
        if (!$integrationType) {
            throw new RuntimeException('An integration type is required! Ex: new FastCommentsIntegrationCore("wordpress")');
        }
        if (!$host) {
            throw new RuntimeException('An integration host is required! A valid default is available, did you try to set this to a weird value?');
        }
        $this->integrationType = $integrationType;
        $this->baseUrl = "$host/integrations/v1";
    }

    public abstract function activate();

    public abstract function deactivate();

    public abstract function createUUID();

    public abstract function getDomain();

    public abstract function getSettingValue($settingName);

    public abstract function setSettingValue($settingName, $settingValue);

    public abstract function makeHTTPRequest($method, $url, $body);

    public abstract function getCurrentUser();

    public abstract function getLoginURL();

    public abstract function getLogoutURL();

    public abstract function handleEvents($events);

    public abstract function getCommentCount();

    public abstract function getComments($startFromDateTime);

    public function base64Encode($stringValue) {
        return base64_encode($stringValue);
    }

    public function log($level, $message) {
        switch ($level) {
            case 'debug':
                echo "DEBUG:::" . $message . "\n";
                break;
            case 'info':
                echo "INFO:::" . $message . "\n";
                break;
            case 'error':
                echo "ERROR:::" . $message . "\n";
                break;
        }
    }

    public function getConfig($timestamp, $urlId, $url, $isReadonly) {
        $ssoKey = $this->getSettingValue('fastcomments_sso_key');
        $tenantId = $this->getSettingValue('fastcomments_tenant_id');
        $isSSOEnabled = $ssoKey && $this->getSettingValue('fastcomments_sso_enabled');
        $result = new stdClass();
        $result->tenantId = ($tenantId) ? $tenantId : 'demo';
        $result->urlId = $urlId;
        $result->url = $url;
        $result->readonly = $isReadonly;
        $result->sso = ($isSSOEnabled) ? $this->getSSOConfig($timestamp, $ssoKey) : null;
        return $result;
    }

    public function getSSOConfig($timestamp, $ssoKey) {
        $result = new stdClass();
        $result->timestamp = $timestamp;
        $sso_user = new stdClass();
        $user = $this->getCurrentUser();
        if ($user) {
            $sso_user->id = $user->id;
            $sso_user->email = $user->email;
            $sso_user->username = $user->username;
            $sso_user->avatar = $user->avatar;
            $sso_user->optedInNotifications = true;
        }
        $userDataJSONBase64 = $this->base64Encode(json_encode($sso_user));
        $verificationHash = hash_hmac('sha256', $timestamp->userDataJSONBase64, $ssoKey);
        $result->userDataJSONBase64 = $userDataJSONBase64;
        $result->verificationHash = $verificationHash;
        $result->loginURL = $this->getLoginURL();
        $result->logoutURL = $this->getLogoutURL();
        return $result;
    }

    public function enableSSO() {
        $token = $this->getSettingValue("fastcomments_token");
        $apiSecretResponseRaw = $this->makeHTTPRequest('GET', "$this->baseUrl/api-secret?token=$token", null);
        $this->log('debug', 'Secret Token Fetch Response Code:' . $apiSecretResponseRaw->responseStatusCode);
        $apiSecretResponse = json_decode($apiSecretResponseRaw->responseBody);
        if ($apiSecretResponse->status === 'success' && $apiSecretResponse->secret) {
            $this->setSettingValue('fastcomments_sso_key', $apiSecretResponse->secret);
            $this->setSettingValue('fastcomments_sso_enabled', true);
        } else {
            throw new RuntimeException("API did not return success response when trying to get the key!");
        }
    }

    public function disableSSO() {
        $this->setSettingValue('fastcomments_sso_key', null);
        $this->setSettingValue('fastcomments_sso_enabled', false);
    }

    public function tick() {
        $nextStateMachineName = 'integrationStateInitial';
        while ($nextStateMachineName) {
            $this->log('debug', 'Next state machine:' . $nextStateMachineName);
            $nextStateMachineName = call_user_func(array($this, $nextStateMachineName));
        }
    }

    public function integrationStateInitial() {
        $tenantId = $this->getSettingValue('fastcomments_tenant_id');
        $token = $this->getSettingValue('fastcomments_token');
        $isTokenValidated = $this->getSettingValue('fastcomments_token_validated');
        if ($tenantId && $token && $isTokenValidated) {
            return 'integrationStatePollNext';
        } else {
            if ($token) {
                return 'integrationStateValidateToken';
            } else {
                return 'integrationStateCreateToken';
            }
        }
    }

    public function integrationStateValidateToken() {
        $token = $this->getSettingValue('fastcomments_token');
        if ($token) {
            $domainName = $this->getDomain();
            $rawTokenUpsertResponse = $this->makeHTTPRequest('PUT', "$this->baseUrl/token?token=$token&integrationType=$this->integrationType&domain=$domainName", null);
            $tokenUpsertResponse = json_decode($rawTokenUpsertResponse->responseBody);
            if ($tokenUpsertResponse->status === 'success' && $tokenUpsertResponse->isTokenValidated === true) {
                $this->setSettingValue('fastcomments_tenant_id', $tokenUpsertResponse->tenantId);
                $this->setSettingValue('fastcomments_token_validated', true);
            }
            return null;
        } else {
            return 'integrationStateCreateToken';
        }
    }

    public function integrationStateCreateToken() {
        $newUUID = $this->createUUID();
        $this->setSettingValue('fastcomments_token', $newUUID);
        return null;
    }

    public function integrationStatePollNext() {
        // One idea to consider, that'd be easier to understand, would be to store the commands locally and a queue and process them.
        // This removes the weird logic where each time a command is finished processing, we advance the fastcomments_stream_last_fetch_timestamp.
        // The reason this logic is weird is the two things are relatively far from each other, potentially being bug prone.
        $token = $this->getSettingValue('fastcomments_token');
        if ($token) {
            $lastFetchDate = $this->getSettingValue('fastcomments_stream_last_fetch_timestamp');
            $lastFetchDateToSend = $lastFetchDate ? $lastFetchDate : 0;
            $rawIntegrationStreamResponse = $this->makeHTTPRequest('GET', "$this->baseUrl/commands?token=$token&fromDateTime=$lastFetchDateToSend", null);
            $this->log('debug', 'Stream response status: ' . $rawIntegrationStreamResponse->responseStatusCode);
            if ($rawIntegrationStreamResponse->responseStatusCode === 200) {
                $response = json_decode($rawIntegrationStreamResponse->responseBody);
                if ($response->status === 'success' && $response->commands) {
                    foreach ($response->commands as $command) {
                        switch ($command->command) {
                            case 'FetchEvents':
                                $this->commandFetchEvents($token);
                                break;
                            case 'SendComments':
                                $this->commandSendComments($token);
                                break;
                        }
                    }
                }
            }
        } else {
            $this->log('error', "Cannot fetch commands, fastcomments_token not set.");
        }
        return null;
    }

    public function commandFetchEvents($token) {
        $fromDateTime = $this->getSettingValue('fastcomments_stream_last_fetch_timestamp');
        $hasMore = true;
        $startedAt = time();
        while ($hasMore && time() - $startedAt < 30 * 1000) {
            $this->log('debug', 'Send events command loop...');
            $fromDateTimeToSend = $fromDateTime ? $fromDateTime : 0;
            $rawIntegrationEventsResponse = $this->makeHTTPRequest('GET', "$this->baseUrl/events?token=$token&fromDateTime=$fromDateTimeToSend", null);
            $response = json_decode($rawIntegrationEventsResponse->responseBody);
            if ($response->status === 'success') {
                $count = count($response->events);
                $this->log('info', "Got events count=[$count]");
                if ($response->events && count($response->events) > 0) {
                    $this->handleEvents($response->events);
                    $fromDateTime = strtotime($response->events[count($response->events) - 1]->createdAt);
                }
                $hasMore = $response->hasMore;
                $this->setSettingValue('fastcomments_stream_last_fetch_timestamp', $fromDateTime);
            } else {
                $this->log('error', "Failed to get events: {$rawIntegrationEventsResponse}");
                break;
            }
        }
    }

    public function commandSendComments($token) {
        $this->log('debug', 'Starting to send comments');
        $lastSendDate = $this->getSettingValue('fastcomments_stream_last_send_timestamp');
        $startedAt = time();
        $hasMore = true;
        $countSyncedSoFar = $this->getSettingValue('fastcomments_comment_sent_count') ? $this->getSettingValue('fastcomments_comment_sent_count') : 0;
        $commentCount = $this->getCommentCount();
        if ($commentCount == 0) {
            $this->log('debug', 'No comments to send. Telling server.');
            $requestBody = json_encode(
                array(
                    "countRemaining" => 0,
                    "comments" => array()
                )
            );
            $httpResponse = $this->makeHTTPRequest('POST', "$this->baseUrl/comments?token=$token", $requestBody);
            $this->log('debug', "Got POST /comments response status code=[$httpResponse->responseStatusCode]");
            $this->setSetupDone();
            return;
        }
        while ($hasMore && time() - $startedAt < 30 * 1000) {
            $this->log('debug', 'Send comments command loop...');
            $getCommentsResponse = $this->getComments($lastSendDate ? $lastSendDate : 0);
            if ($getCommentsResponse['status'] === 'success') {
                $count = count($getCommentsResponse['comments']);
                $hasMore = $getCommentsResponse['hasMore'];
                $this->log('info', "Got comments to send count=[$count] hasMore=[$hasMore]");
                if ($getCommentsResponse['comments'] && count($getCommentsResponse['comments']) > 0) {
                    $countRemaining = max($commentCount - (count($getCommentsResponse['comments']) + $countSyncedSoFar), 0);
                    $requestBody = json_encode(
                        array(
                            "countRemaining" => $countRemaining,
                            "comments" => $getCommentsResponse['comments']
                        )
                    );
                    $httpResponse = $this->makeHTTPRequest('POST', "$this->baseUrl/comments?token=$token", $requestBody);
                    $this->log('debug', "Got POST /comments response status code=[$httpResponse->responseStatusCode]");
                    $response = json_decode($httpResponse->responseBody);
                    if ($response->status === 'success') {
                        $fromDateTime = strtotime($getCommentsResponse['comments'][count($getCommentsResponse['comments']) - 1]['date']) * 1000;
                        $lastSendDate = $fromDateTime;
                        $this->setSettingValue('fastcomments_stream_last_send_timestamp', $fromDateTime);
                        $countSyncedSoFar += count($getCommentsResponse['comments']);
                        $this->setSettingValue('fastcomments_comment_sent_count', $countSyncedSoFar);
                        if (!$hasMore) {
                            $this->setSetupDone();
                            break;
                        }
                    }
                } else {
                    $this->setSetupDone();
                    break;
                }
            } else {
                $status = $getCommentsResponse['status'];
                $comments = $getCommentsResponse['comments'];
                $debugHasMore = $getCommentsResponse['hasMore'];
                $this->log('error', "Failed to get comments to send: status=[$status] comments=[$comments] hasMore=[$debugHasMore]}");
                break;
            }
        }
        $this->log('debug', 'Done sending comments');
    }

    private function setSetupDone() {
        $this->setSettingValue('fastcomments_setup', true);
        $this->setSettingValue('fastcomments_stream_last_fetch_timestamp', time() * 1000);
    }

}
