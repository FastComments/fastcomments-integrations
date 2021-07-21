const {FastCommentsIntegrationCore} = require('../FastCommentsIntegrationCore');
const {v4} = require('uuid');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

class TestDB {
    constructor(name) {
        this.name = name;
        this.path = path.join(__dirname, `git-ignore-test-db-${name}.json`);
        this.read();
    }

    clear() {
        this.data = {};
        this.write();
    }

    write() {
        fs.writeFileSync(this.path, JSON.stringify(this.data), 'utf8');
    }

    read() {
        if (!fs.existsSync(this.path)) {
            this.data = {};
        }
        this.data = JSON.parse(fs.readFileSync(this.path, 'utf8'));
    }

    getData() {
        return this.data;
    }

    setValue(name, value) {
        this.data[name] = value;
        this.write();
    }

    unsetValue(name) {
        delete this.data[name];
        this.write();
    }

    getValue(name) {
        this.read();
        return this.data[name];
    }
}

// First we implement FastCommentsIntegrationCore, configuring our storage and other environment specific methods.
class FastCommentsIntegrationCoreExample extends FastCommentsIntegrationCore {
    constructor() {
        super('test', process.env.FC_HOST);

        // In the real world, you'd use a database or key value store to store these values.
        this.settingDB = new TestDB('settings'); // we'll need a place to store the settings
        this.fcToOurIds = new TestDB('fcToOurIds'); // we'll need a table, or way to map, the FastComments ids to your ids.
        this.commentDB = new TestDB('comments'); // we'll need a table to store the comments by id.
    }

    dropDatabase() {
        this.settingDB.clear();
        this.fcToOurIds.clear();
        this.commentDB.clear();
    }

    /**
     * @description Activate the integration. Create a table, for example.
     * @return {string}
     */
    async activate() {
        // FastComments doesn't require you to set fastcomments_setup. This is just an example.
        return this.setSettingValue('fastcomments_setup', true);
    }

    /**
     * Log something. Override this with your logger if desired.
     * @param {'info'|'error'|'debug'} level
     * @param {string} message
     */
    log(level, message) {
        switch (level) {
            case 'debug':
                console.debug(message);
                break;
            case 'info':
                console.info(message);
                break;
            case 'error':
                console.error(message);
                break;
        }
    }

    /**
     * @description Create a UUID. Implement using the UUID library of your choice.
     * @return {string}
     */
    createUUID() {
        return v4();
    }

    /**
     * @description Get the domain name the integration is running on (like myawesomeblog.com).
     * @return {Promise<string>}
     */
    async getDomain() {
        return 'my-awesome-site.com';
    }

    /**
     *
     * @param {string} settingName
     * @return {Promise<string|number|boolean|null|undefined>}
     */
    async getSettingValue(settingName) {
        return this.settingDB.getValue(settingName);
    }

    /**
     *
     * @param {*} settingName
     * @param {string|number|boolean|null|undefined} settingValue
     * @return {Promise<void>}
     */
    async setSettingValue(settingName, settingValue) {
        this.settingDB.setValue(settingName, settingValue);
    }

    /**
     * @typedef {Object} HTTPResponse
     * @property {string} responseBody
     * @property {number} responseStatus
     */

    /**
     *
     * @param {string} method
     * @param {string} url
     * @param {string} [body]
     * @return {Promise<HTTPResponse>}
     */
    async makeHTTPRequest(method, url, body) {
        this.log('info', `Making request: method=[${method}] url=${url} body=[${body}]`);
        const rawResponse = await axios({
            method,
            url,
            data: body,
            transformResponse: (res) => {
                return res; // this is because makeHTTPRequest only expects to work with string http bodies.
            },
            headers: {
                'Content-Type': 'application/json'
            },
            responseType: 'text'
        });
        return {
            responseBody: rawResponse.data,
            responseStatus: rawResponse.status
        }
    }

    /**
     * @typedef {Object} User
     * @property {string} id
     * @property {string} email
     * @property {string} username
     * @property {string} avatar
     */

    /**
     *
     * @return {Promise<User>}
     */
    async getCurrentUser() {
        return {
            id: 'some-user-id',
            email: 'some@email.com',
            username: 'some-user-name',
            avatar: 'https://static.fastcomments.com/1605337537848-DSC_0841.JPG'
        };
    }

    /**
     *
     * @return {Promise<string>}
     */
    async getLoginURL() {
        return 'https://example.com/login';
    }

    /**
     *
     * @return {Promise<string>}
     */
    async getLogoutURL() {
        return 'https://example.com/logout';
    }

    /**
     * @param {Array.<FastCommentsEventStreamItem>} events
     * @return {Promise<void>}
     */
    async handleEvents(events) {
        for (const event of events) {
            try {
                /** @type {FastCommentsEventStreamItemData} **/
                const eventData = JSON.parse(event.data);
                let ourId;
                let fcId;
                let ourComment;
                switch (eventData.type) {
                    case 'new-comment':
                        ourId = this.createUUID();
                        fcId = eventData.comment._id;
                        this.fcToOurIds.setValue(fcId, ourId);
                        this.commentDB.setValue(ourId, eventData.comment);
                        break;
                    case 'updated-comment':
                        ourId = this.fcToOurIds.getValue(eventData.comment._id);
                        this.commentDB.setValue(ourId, eventData.comment);
                        break;
                    case 'deleted-comment':
                        ourId = this.fcToOurIds.getValue(eventData.comment._id);
                        this.commentDB.unsetValue(ourId);
                        break;
                    case 'new-vote':
                        ourId = this.fcToOurIds.getValue(eventData.comment._id);
                        ourComment = this.commentDB.getValue(ourId);
                        if (eventData.vote.direction > 0) {
                            ourComment.votes++;
                            ourComment.votesUp++;
                        } else {
                            ourComment.votes--;
                            ourComment.votesDown++;
                        }
                        break;
                    case 'deleted-vote':
                        ourId = this.fcToOurIds.getValue(eventData.comment._id);
                        ourComment = this.commentDB.getValue(ourId);
                        if (eventData.vote.direction > 0) {
                            ourComment.votes--;
                            ourComment.votesUp--;
                        } else {
                            ourComment.votes++;
                            ourComment.votesDown--;
                        }
                        break;
                }
            } catch (e) {
                this.log('error', e.toString());
            }
        }
    }

    /**
     * @return {Promise<number>}
     */
    async getCommentCount() {
        return Object.values(this.commentDB.getData()).length;
    }

    /**
     * @typedef {Object} GetCommentsResponse
     * @property {'success'|'failure'} status
     * @property {Array.<FastCommentsEventStreamDataComment>} comments
     * @property {boolean} hasMore
     */

    /**
     * @param {number} startFromDateTime
     * @return {Promise<GetCommentsResponse>}
     */
    async getComments(startFromDateTime) {
        // obviously, you would use a proper database with carefully designed indexes, right? :)

        async function getCommentsFrom(db, startFromDateTime) {
            return Object.values(db)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // we want to send comments oldest -> newest
                .filter((comment, index) => new Date(comment.date).getTime() >= startFromDateTime);
        }

        const comments = await getCommentsFrom(this.commentDB.getData(), startFromDateTime);
        const remainingComments = comments ? await getCommentsFrom(this.commentDB.getData(), comments[comments.length - 1].date) : [];
        return {
            status: 'success',
            comments: comments,
            hasMore: remainingComments.length > 0
        }
    }
}

// Now we create an example "app" and use our example class that manages the integration.
class FastCommentsCoreExampleUsage {
    constructor() {
        this.fastComments = new FastCommentsIntegrationCoreExample();
    }

    async createToken() {
        let hasToken = false;
        while (!hasToken) {
            console.log('Polling for token...');
            await this.fastComments.tick();
            hasToken = !!(await this.fastComments.getSettingValue('fastcomments_token'));
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        console.log('Got token!', await this.fastComments.getSettingValue('fastcomments_token'));
    }

    async waitForTenantId() {
        let hasTenantId = false;
        while (!hasTenantId) {
            console.log('Polling for tenant id... (set when user accepts token in admin).');
            await this.fastComments.tick();
            hasTenantId = !!(await this.fastComments.getSettingValue('fastcomments_tenant_id'));
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        console.log('Got tenant id!', await this.fastComments.getSettingValue('fastcomments_tenant_id'));
    }

    async cron() {
        return this.fastComments.tick();
    }
}

module.exports = {FastCommentsCoreExampleUsage}
