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
        $this->baseUrl = "/integrations/v1{$host}";
    }

    public abstract function activate();

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
                echo "DEBUG:::" . $message;
                break;
            case 'info':
                echo "INFO:::" . $message;
                break;
            case 'error':
                echo "ERROR:::" . $message;
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

    public function tick() {
        $nextStateMachineName = 'integrationStateInitial';
        while ($nextStateMachineName) {
            $this->log('debug', 'Next state machine:' . $nextStateMachineName);
            $nextStateMachineName = call_user_func(array($this, $nextStateMachineName));
        }
    }

    public function integrationStateInitial() {
        $tenantId = $this->getSettingValue('fastcomments_tenant_id');
        if ($tenantId) {
            return 'integrationStatePollNext';
        } else {
            $token = $this->getSettingValue('fastcomments_token');
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
            $rawTokenUpsertResponse = $this->makeHTTPRequest('PUT', "/token?token=&integrationType=&domain={$this->baseUrl}{$token}{$this->integrationType}{$domainName}", null);
            $tokenUpsertResponse = json_decode($rawTokenUpsertResponse->responseBody);
            if ($tokenUpsertResponse->status === 'success' && $tokenUpsertResponse->isTokenValidated === true) {
                $this->setSettingValue('fastcomments_tenant_id', $tokenUpsertResponse->tenantId);
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
        $token = $this->getSettingValue('fastcomments_token');
        $lastFetchDate = $this->getSettingValue('fastcomments_stream_last_fetch_timestamp');
        $rawIntegrationStreamResponse = $this->makeHTTPRequest('GET', "/commands?token=&fromDateTime={$this->baseUrl}{$token}{($lastFetchDate) ? $lastFetchDate : 0}", null);
        $this->log('debug', 'Stream response status: ' . $rawIntegrationStreamResponse->responseStatus);
        if ($rawIntegrationStreamResponse->responseStatus === 200) {
            $response = json_decode($rawIntegrationStreamResponse->responseBody);
            if ($response->status === 'success' && $response->commands) {
                foreach ($response->commands as $command => $___) {
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
        return null;
    }

    public function commandFetchEvents($token) {
        $fromDateTime = $this->getSettingValue('fastcomments_stream_last_fetch_timestamp');
        $hasMore = true;
        $startedAt = time();
        while ($hasMore && time() - $startedAt < 30 * 1000) {
            $rawIntegrationEventsResponse = $this->makeHTTPRequest('GET', "/events?token=&fromDateTime={$this->baseUrl}{$token}{($fromDateTime) ? $fromDateTime : 0}", null);
            $response = json_decode($rawIntegrationEventsResponse->responseBody);
            if ($response->status === 'success') {
                $this->log('info', "Got events count: {count($response->events)}");
                if ($response->events && count($response->events) > 0) {
                    $this->handleEvents($response->events);
                    $fromDateTime = $response->events[count($response->events) - 1]->createdAt;
                    $this->setSettingValue('fastcomments_stream_last_fetch_timestamp', $fromDateTime);
                } else {
                    break;
                }
                $hasMore = $response->hasMore;
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
        $countSyncedSoFar = 0;
        $commentCount = $this->getCommentCount();
        while ($hasMore && time() - $startedAt < 30 * 1000) {
            $getCommentsResponse = $this->getComments(($lastSendDate) ? $lastSendDate : 0);
            if ($getCommentsResponse->status === 'success') {
                $this->log('info', "Got comments to send count=[] hasMore=[]{count($getCommentsResponse->comments)}{$getCommentsResponse->hasMore}");
                if ($getCommentsResponse->comments && count($getCommentsResponse->comments) > 0) {
                    $httpResponse = $this->makeHTTPRequest('POST', "/comments?token={$this->baseUrl}{$token}", json_encode(array("countRemaining" => $commentCount - count($getCommentsResponse->comments) + $countSyncedSoFar, "comments" => $getCommentsResponse->comments)));
                    $this->log('debug', "Got POST /comments response status code=[]{$httpResponse->responseStatus}");
                    $response = json_decode($httpResponse->responseBody);
                    if ($response->status === 'success') {
                        $fromDateTime = $getCommentsResponse->comments[count($getCommentsResponse->comments) - 1]->createdAt;
                        $lastSendDate = $fromDateTime;
                        $this->setSettingValue('fastcomments_stream_last_send_timestamp', $fromDateTime);
                        $hasMore = $getCommentsResponse->hasMore;
                        $countSyncedSoFar += count($getCommentsResponse->comments);
                        if (!$hasMore) {
                            $this->setSettingValue('fastcomments_sync_completed', true);
                            break;
                        }
                    } else {
                    }
                } else {
                    $this->setSettingValue('fastcomments_sync_completed', true);
                    break;
                }
            } else {
                $this->log('error', "Failed to get comments to send: status=[] comments=[] hasMore=[]{$getCommentsResponse->status}{$getCommentsResponse->comments}{$getCommentsResponse->hasMore}");
                break;
            }
        }
        $this->log('debug', 'Done sending comments');
    }

}