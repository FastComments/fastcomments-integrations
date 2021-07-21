<?php

require(__DIR__ . '/../FastCommentsIntegrationCore.php');

class TestDB {
    public $name;
    public $path;
    private $data;

    public function __construct($name) {
        $this->name = $name;
        $this->path = __DIR__ . "/git-ignore-test-db-$name.json";
        $this->read();
    }

    public function clear() {
        $this->data = array();
        $this->write();
    }

    public function write() {
        file_put_contents($this->path, json_encode($this->data));
    }

    public function read() {
        if (!file_exists($this->path)) {
            $this->data = array();
            return;
        }
        $rawFileContents = file_get_contents($this->path);
        $this->data = json_decode($rawFileContents, true);
    }

    public function getData() {
        return $this->data;
    }

    public function setValue($name, $value) {
        $this->data[$name] = $value;
        $this->write();
    }

    public function unsetValue($name) {
        unset($this->data[$name]);
        $this->write();
    }

    public function getValue($name) {
        $this->read();
        return isset($this->data[$name]) ? $this->data[$name] : null;
    }
}

class FastCommentsIntegrationCoreExample extends FastCommentsIntegrationCore {

    public $settingDB;
    public $fcToOurIds;
    public $commentDB;

    public function __construct() {
        if (getenv('FC_HOST')) {
            parent::__construct('test', getenv('FC_HOST'));
        } else {
            parent::__construct('test');
        }

        // In the real world, you'd use a database or key value store to store these values.
        $this->settingDB = new TestDB('settings'); // we'll need a place to store the settings
        $this->fcToOurIds = new TestDB('fcToOurIds'); // we'll need a table, or way to map, the FastComments ids to your ids.
        $this->commentDB = new TestDB('comments'); // we'll need a table to store the comments by id.
    }

    public function dropDatabase() {
        $this->settingDB->clear();
        $this->fcToOurIds->clear();
        $this->commentDB->clear();
    }

    public function activate() {
        // FastComments doesn't require you to set fastcomments_setup. This is just an example.
        $this->setSettingValue('fastcomments_setup', true);
    }

    public function createUUID() {
        return uniqid();
    }

    public function getDomain() {
        return 'my-awesome-site.com';
    }

    public function getSettingValue($settingName) {
        return $this->settingDB->getValue($settingName);
    }

    public function setSettingValue($settingName, $settingValue) {
        $this->settingDB->setValue($settingName, $settingValue);
    }

    public function makeHTTPRequest($method, $url, $body) {
        $curl = curl_init();

        switch ($method) {
            case "POST":
                curl_setopt($curl, CURLOPT_POST, 1);
                if ($body) {
                    curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
                }
                break;
            case "PUT":
                curl_setopt($curl, CURLOPT_PUT, 1);
                break;
            default:
                if ($body) {
                    $url = sprintf("%s?%s", $url, http_build_query($body));
                }
        }

        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
//        curl_setopt($curl, CURLOPT_VERBOSE, true);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);

        $rawResult = curl_exec($curl);

        $result = new stdClass();
        $result->responseCode = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $result->responseBody = $rawResult;

        // TODO remove
        echo "Response URL " . $method . " " . $url . "\n";
        echo "Response Code " . $result->responseCode . "\n";
        echo "Response body " . $result->responseBody . "\n";

        curl_close($curl);

        return $result;
    }

    public function getCurrentUser() {
        return array(
            "id" => "some-user-id",
            "email" => "some@email.com",
            "username" => "some-user-name",
            "avatar" => "https://static.fastcomments.com/1605337537848-DSC_0841.JPG"
        );
    }

    public function getLoginURL() {
        return 'https://example.com/login';
    }

    public function getLogoutURL() {
        return 'https://example.com/logout';
    }

    public function handleEvents($events) {
        foreach ($events as $event) {
            try {
                /** @type {FastCommentsEventStreamItemData} * */
                $eventData = json_decode($event->data);
                $ourId = null;
                $fcId = null;
                $ourComment = null;
                switch ($eventData->type) {
                    case 'new-comment':
                        $ourId = $this->createUUID();
                        $fcId = $eventData->comment->_id;
                        $this->fcToOurIds->setValue($fcId, $ourId);
                        $this->commentDB->setValue($ourId, $eventData->comment);
                        break;
                    case 'updated-comment':
                        $ourId = $this->fcToOurIds[$eventData->comment->_id];
                        $this->commentDB->setValue($ourId, $eventData->comment);
                        break;
                    case 'deleted-comment':
                        $ourId = $this->fcToOurIds->getValue($eventData->comment->_id);
                        $this->commentDB->unsetValue($ourId);
                        break;
                    case 'new-vote':
                        $ourId = $this->fcToOurIds->getValue($eventData->comment->_id);
                        $ourComment = $this->commentDB->getValue($ourId);
                        if ($eventData->vote->direction > 0) {
                            $ourComment->votes++;
                            $ourComment->votesUp++;
                        } else {
                            $ourComment->votes--;
                            $ourComment->votesDown++;
                        }
                        break;
                    case 'deleted-vote':
                        $ourId = $this->fcToOurIds->getValue($eventData->comment->_id);
                        $ourComment = $this->commentDB->getValue($ourId);
                        if ($eventData->vote->direction > 0) {
                            $ourComment->votes--;
                            $ourComment->votesUp--;
                        } else {
                            $ourComment->votes++;
                            $ourComment->votesDown--;
                        }
                        break;
                }
            } catch (Exception $e) {
                $this->log('error', $e->getMessage());
            }
        }
    }

    public function getCommentCount() {
        return count($this->commentDB->getData());
    }

    public function getComments($startFromDateTime) {
        // obviously, you would use a proper database with carefully designed indexes, right? :)

        function getCommentsFrom($db, $startFromDateTime) {
            $dbValues = array_values($db);
            function cmp($a, $b) {
            }

            usort($dbValues, function ($a, $b) {
                return strtotime($a->date) - strtotime($b->date); // we want oldest to newest
            });

            return array_filter($dbValues, function ($comment) use (&$startFromDateTime) {
                return strtotime($comment->date) >= $startFromDateTime;
            });
        }

        $comments = getCommentsFrom($this->commentDB->getData(), $startFromDateTime);
        $remainingComments = count($comments) > 0 ? getCommentsFrom($this->commentDB->getData(), $comments[count($comments) - 1]->date) : [];
        return array(
            "status" => "success",
            "comments" => $comments,
            "hasMore" => count($remainingComments) > 0
        );
    }
}

// Now we create an example "app" and use our example class that manages the integration.
class FastCommentsCoreExampleUsage {
    public $fastComments;

    public function __construct() {
        $this->fastComments = new FastCommentsIntegrationCoreExample();
    }

    public function createToken() {
        $hasToken = false;
        while (!$hasToken) {
            echo 'Polling for token...';
            $this->fastComments->tick();
            $hasToken = $this->fastComments->getSettingValue('fastcomments_token') !== null;
            sleep(1);
        }
        echo 'Got Token! ' . $this->fastComments->getSettingValue('fastcomments_token');
    }

    public function waitForTenantId() {
        $hasTenantId = false;
        while (!$hasTenantId) {
            echo 'Polling for tenant id... (set when user accepts token in admin).';
            $this->fastComments->tick();
            $hasTenantId = $this->fastComments->getSettingValue('fastcomments_tenant_id') !== null;
            sleep(1);
        }
        echo 'Got tenant id! ' . $this->fastComments->getSettingValue('fastcomments_tenant_id');
    }

    public function cron() {
        $this->fastComments->tick();
    }
}