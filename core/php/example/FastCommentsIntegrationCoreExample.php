<?php

require '../FastCommentsIntegrationCore.php';

class FastCommentsIntegrationCoreExample extends FastCommentsIntegrationCore {

    public $settingDB;
    public $fcToOurIds;
    public $commentDB;

    public function __construct() {
        parent::__construct('test', getenv('FC_HOST'));
        $this->settingDB = array();
        $this->fcToOurIds = array(); // we'll need a table, or way to map, the FastComments ids to your ids.
        $this->commentDB = array(); // we'll need a table to store the comments by id.
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
        return $this->settingDB[$settingName];
    }

    public function setSettingValue($settingName, $settingValue) {
        $this->settingDB[$settingName] = $settingValue;
    }

    public function makeHTTPRequest($method, $url, $body) {
        // TODO: Implement makeHTTPRequest() method.
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
        // TODO: Implement handleEvents() method.
    }

    public function getCommentCount() {
        return count($this->commentDB);
    }

    public function getComments($startFromDateTime) {
        // obviously, you would use a proper database with carefully designed indexes, right? :)

        function getCommentsFrom($db, $startFromDateTime) {
            $dbValues = array_values($db);
            function cmp($a, $b) {
            }
            usort($dbValues, function($a, $b) {
                return strtotime($a->date) - strtotime($b->date); // we want oldest to newest
            });

            return array_filter($dbValues, function($comment) use (&$startFromDateTime) {
                return strtotime($comment->date) >= $startFromDateTime;
            });
        }

        $comments = getCommentsFrom($this->commentDB, $startFromDateTime);
        $remainingComments = count($comments) > 0 ? getCommentsFrom($this->commentDB, $comments[count($comments) - 1]->date) : [];
        return array(
            "status" => "success",
            "comments" => $comments,
            "hasMore" => count($remainingComments) > 0
        );
    }
}
