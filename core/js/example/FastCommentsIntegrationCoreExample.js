const {FastCommentsIntegrationCore} = require('../FastCommentsIntegrationCore');
const {v4} = require('uuid');
const axios = require('axios');

// First we implement FastCommentsIntegrationCore, configuring our storage and other environment specific methods.
class FastCommentsIntegrationCoreExample extends FastCommentsIntegrationCore {
    constructor() {
        super('test', process.env.FC_HOST);
        this.settingDB = {};
        this.fcToOurIds = {}; // we'll need a table, or way to map, the FastComments ids to your ids.
        this.commentDB = {}; // we'll need a table to store the comments by id.
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
        return this.settingDB[settingName];
    }

    /**
     *
     * @param {*} settingName
     * @param {string|number|boolean|null|undefined} settingValue
     * @return {Promise<void>}
     */
    async setSettingValue(settingName, settingValue) {
        this.settingDB[settingName] = settingValue;
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
                        this.fcToOurIds[fcId] = ourId;
                        this.commentDB[ourId] = eventData.comment;
                        break;
                    case 'updated-comment':
                        ourId = this.fcToOurIds[eventData.comment._id];
                        this.commentDB[ourId] = eventData.comment;
                        break;
                    case 'deleted-comment':
                        ourId = this.fcToOurIds[eventData.comment._id];
                        delete this.commentDB[ourId];
                        break;
                    case 'new-vote':
                        ourId = this.fcToOurIds[eventData.comment._id];
                        ourComment = this.commentDB[ourId];
                        if (eventData.vote.direction > 0) {
                            ourComment.votes++;
                            ourComment.votesUp++;
                        } else {
                            ourComment.votes--;
                            ourComment.votesDown++;
                        }
                        break;
                    case 'deleted-vote':
                        ourId = this.fcToOurIds[eventData.comment._id];
                        ourComment = this.commentDB[ourId];
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
     * @typedef {Object} GetCommentsResponse
     * @property {'success'|'failure'} status
     * @property {Array.<FastCommentsEventStreamDataComment>} comments
     * @property {boolean} hasMore
     */

    /**
     * @param {number} startFromDateTime
     * @param {number} skip
     * @return {Promise<GetCommentsResponse>}
     */
    async getComments(startFromDateTime, skip) {
        // obviously, you would use a proper database with carefully designed indexes, right? :)
        const limit = 10;
        const comments = Object.values(this.commentDB)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // we want to send comments oldest -> newest
            .filter((comment, index) => (!skip || index >= skip) && index < limit && new Date(comment.date).getTime() >= startFromDateTime);
        return {
            status: 'success',
            comments: comments,
            hasMore: comments.length === limit
        }
    }
}

// Now we create an example "app" and use our example class that manages the integration.
class FastCommentsCoreExampleUsage {
    constructor() {
        this.fastComments = new FastCommentsIntegrationCoreExample();
    }

    async startSetupPoll() {
        let hasToken = false;
        while (!hasToken) {
            console.log('Polling for token...');
            await this.fastComments.tick();
            hasToken = !!(await this.fastComments.getSettingValue('fastcomments_token'));
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        console.log('Got token!', await this.fastComments.getSettingValue('fastcomments_token'));
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
