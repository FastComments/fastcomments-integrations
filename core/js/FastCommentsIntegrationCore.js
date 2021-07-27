/**
 * @typedef {Object} FastCommentsTokenUpsertResponse
 * @property {'success'|'failure'} status
 * @property {string} [code] - Error code.
 * @property {string} [reason] - Readable reason for error.
 * @property {boolean} isTokenValidated
 * @property {string} tenantId
 */

/**
 * @typedef {Object} FastCommentsCommandStreamItem
 * @property {string|null} id - null for SYNC commands
 * @property {'SendComments', 'FetchEvents'} command - Which command to run.
 * @property {number} [eventCount] - For Sync commands, the number of events waiting.
 */

/**
 * @typedef {Object} FastCommentsCommandStreamResponse
 * @property {'success'|'failure'} status
 * @property {Array.<FastCommentsCommandStreamItem>} [commands]
 */

/**
 * @typedef {Object} FastCommentsEventStreamDataComment
 * @property {string} _id
 * @property {string} externalId
 * @property {string} tenantId
 * @property {string} urlId
 * @property {string} urlIdRaw
 * @property {string} url
 * @property {string} pageTitle
 * @property {string} userId
 * @property {string} commenterName
 * @property {string} commenterEmail
 * @property {string} comment
 * @property {string} commentHTML
 * @property {string} parentId
 * @property {string} date
 * @property {number} votes
 * @property {number} votesUp
 * @property {number} votesDown
 * @property {boolean} verified
 * @property {boolean} notificationSentForParent
 * @property {boolean} notificationSentForParentTenant
 * @property {boolean} reviewed
 * @property {string} avatarSrc
 * @property {boolean} isSpam
 * @property {boolean} aiDeterminedSpam
 * @property {boolean} hasImages
 * @property {boolean} hasLinks
 * @property {boolean} approved
 * @property {string} locale
 * @property {boolean} isByAdmin
 * @property {boolean} isByModerator
 */

/**
 * @typedef {Object} FastCommentsEventStreamDataVote
 * @property {string} _id
 * @property {string} commentExternalId
 * @property {string} tenantId
 * @property {string} urlId
 * @property {string} urlIdRaw
 * @property {string} commentId
 * @property {string} userId
 * @property {number} direction - -1 for down, 1 for up
 * @property {number} createdAt - milliseconds
 */

/**
 * @typedef {Object} FastCommentsEventStreamItemData
 * @property {'new-comment'|'updated-comment'|'deleted-comment'|'new-vote'|'deleted-vote'} type
 * @property {string} broadcastId
 * @property {number} timestamp
 * @property {FastCommentsEventStreamDataComment} [comment]
 * @property {FastCommentsEventStreamDataVote} [vote]
 */

/**
 * @typedef {Object} FastCommentsEventStreamItem
 * @property {string} createdAt
 * @property {string} urlId
 * @property {string} data - json data payload (FastCommentsEventStreamItemData)
 */

/**
 * @typedef {Object} FastCommentsEventStreamResponse
 * @property {'success'|'failure'} status
 * @property {Array.<FastCommentsEventStreamItem>} [events]
 * @property {boolean} hasMore
 */

class FastCommentsIntegrationCore {
    constructor(integrationType, host = 'https://fastcomments.com') {
        if (!integrationType) {
            throw new Error('An integration type is required! Ex: new FastCommentsIntegrationCore("wordpress")');
        }
        if (!host) {
            throw new Error('An integration host is required! A valid default is available, did you try to set this to a weird value?');
        }
        this.integrationType = integrationType;
        this.baseUrl = `${host}/integrations/v1`;
    }

    /**
     * @description Activate the integration. Create tables, for example.
     * @return {string}
     */
    async activate() {
        throw new Error('Implement me! activate()');
    }

    /**
     * @description Deactivate the integration. Remove tables, for example.
     * @return {string}
     */
    async deactivate() {
        throw new Error('Implement me! deactivate()');
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
        throw new Error('Implement me! createUUID()');
    }

    /**
     * @description Get the domain name the integration is running on (like myawesomeblog.com).
     * @return {Promise<string>}
     */
    async getDomain() {
        throw new Error('Implement me! getDomain()');
    }

    /**
     *
     * @param {string} settingName
     * @return {Promise<string|number|boolean|null|undefined>}
     */
    async getSettingValue(settingName) {
        throw new Error('Implement me! getSettingValue()');
    }

    /**
     *
     * @param {*} settingName
     * @param {string|number|boolean|null|undefined} settingValue
     * @return {Promise<void>}
     */
    async setSettingValue(settingName, settingValue) {
        throw new Error('Implement me! setSettingValue()');
    }

    /**
     * @typedef {Object} HTTPResponse
     * @property {string} responseBody
     * @property {number} responseStatusCode
     */

    /**
     *
     * @param {string} method
     * @param {string} url
     * @param {string} [body]
     * @return {Promise<HTTPResponse>}
     */
    async makeHTTPRequest(method, url, body) {
        throw new Error('Implement me! makeHTTPRequest()');
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
        throw new Error('Implement me! makeHTTPRequest()');
    }

    /**
     *
     * @return {Promise<string>}
     */
    async getLoginURL() {
        throw new Error('Implement me! getLoginURL()');
    }

    /**
     *
     * @return {Promise<string>}
     */
    async getLogoutURL() {
        throw new Error('Implement me! getLogoutURL()');
    }

    /**
     * @param {Array.<FastCommentsEventStreamItem>} events
     * @return {Promise<void>}
     */
    async handleEvents(events) {
        throw new Error('Implement me! handleEvents()');
    }

    /**
     * @typedef {Object} GetCommentsResponse
     * @property {'success'|'failure'} status
     * @property {Array.<FastCommentsEventStreamDataComment>} comments
     * @property {boolean} hasMore
     */

    /**
     * @return {Promise<number>}
     */
    async getCommentCount() {
        throw new Error('Implement me! getCommentCount()');
    }

    /**
     * @param {number} startFromDateTime
     * @return {Promise<GetCommentsResponse>}
     */
    async getComments(startFromDateTime) {
        throw new Error('Implement me! getComments()');
    }

    /**
     * Base64 encoding mechanism can vary depending on VM/env, so define your own if needed.
     * This impl. works with NodeJS.
     * @param {string} stringValue
     * @return {string}
     */
    base64Encode(stringValue) {
        return Buffer.from(stringValue).toString('base64');
    }

    async getConfig(timestamp, urlId, url, isReadonly) {
        const [ssoKey, tenantId] = await Promise.all([
            this.getSettingValue('fastcomments_sso_key'),
            this.getSettingValue('fastcomments_tenant_id')
        ]);
        const isSSOEnabled = ssoKey && await this.getSettingValue('fastcomments_sso_enabled');
        return {
            tenantId: tenantId ? tenantId : 'demo',
            urlId: urlId,
            url: url,
            readonly: isReadonly,
            sso: isSSOEnabled ? await this.getSSOConfig(timestamp, ssoKey) : null
        };
    }

    async getSSOConfig(timestamp, ssoKey) {
        const result = {};
        result.timestamp = timestamp;

        const sso_user = {};
        const user = await this.getCurrentUser();
        if (user) {
            sso_user.id = user.id;
            sso_user.email = user.email;
            sso_user.username = user.username;
            sso_user.avatar = user.avatar;
            sso_user.optedInNotifications = true;
        }

        const userDataJSONBase64 = this.base64Encode(JSON.stringify(sso_user));
        const verificationHash = hash_hmac('sha256', timestamp.userDataJSONBase64, ssoKey);

        result.userDataJSONBase64 = userDataJSONBase64;
        result.verificationHash = verificationHash;

        const [loginURL, logoutURL] = await Promise.all([
            this.getLoginURL(),
            this.getLogoutURL()
        ]);

        result.loginURL = loginURL;
        result.logoutURL = logoutURL;

        return result;
    }

    /**
     * Checks for commands and new events and consumes them. Fires off requests for any pending commands.
     * You should call this every second or so until initial setup is done, and then maybe once a week thereafter, but not
     * less than once every 2 weeks as events in the log will expire after that.
     * @return {Promise<void>}
     */
    async tick() {
        let nextStateMachine = this.integrationStateInitial;
        while (nextStateMachine) {
            this.log('debug', 'Next state machine:' + nextStateMachine.name);
            nextStateMachine = await nextStateMachine.call(this);
        }
    }

    async integrationStateInitial() {
        const tenantId = await this.getSettingValue('fastcomments_tenant_id');
        if (tenantId) {
            return this.integrationStatePollNext;
        } else {
            const token = await this.getSettingValue('fastcomments_token');
            if (token) {
                return this.integrationStateValidateToken;
            } else {
                return this.integrationStateCreateToken;
            }
        }
    }

    async integrationStateValidateToken() {
        const token = await this.getSettingValue('fastcomments_token');
        if (token) {
            const domainName = await this.getDomain();
            const rawTokenUpsertResponse = await this.makeHTTPRequest('PUT', `${this.baseUrl}/token?token=${token}&integrationType=${this.integrationType}&domain=${domainName}`);
            /** @type {FastCommentsTokenUpsertResponse} **/
            const tokenUpsertResponse = JSON.parse(rawTokenUpsertResponse.responseBody);
            if (tokenUpsertResponse.status === 'success' && tokenUpsertResponse.isTokenValidated === true) {
                await this.setSettingValue('fastcomments_tenant_id', tokenUpsertResponse.tenantId);
            }
            // TODO handle "token does not exist"
            // TODO handle "token taken"
            return null;
        } else {
            return this.integrationStateCreateToken;
        }
    }

    async integrationStateCreateToken() {
        const newUUID = this.createUUID();
        await this.setSettingValue('fastcomments_token', newUUID);
        return null; // next time we tick() - we'll do integrationStateValidateToken()
    }

    async integrationStatePollNext() {
        const [token, lastFetchDate] = await Promise.all([
            this.getSettingValue('fastcomments_token'),
            this.getSettingValue('fastcomments_stream_last_fetch_timestamp')
        ]);
        const rawIntegrationStreamResponse = await this.makeHTTPRequest('GET', `${this.baseUrl}/commands?token=${token}&fromDateTime=${lastFetchDate ? lastFetchDate : 0}`);
        this.log('debug', 'Stream response status: ' + rawIntegrationStreamResponse.responseStatusCode);
        if (rawIntegrationStreamResponse.responseStatusCode === 200) {
            /** @type {FastCommentsCommandStreamResponse} **/
            const response = JSON.parse(rawIntegrationStreamResponse.responseBody);
            if (response.status === 'success' && response.commands) {
                for (const command of response.commands) {
                    switch (command.command) {
                        case 'FetchEvents':
                            await this.commandFetchEvents(token)
                            break;
                        case 'SendComments':
                            await this.commandSendComments(token);
                            break;
                    }
                }
            }
        }

        return null;
    }

    async commandFetchEvents(token) {
        let fromDateTime = await this.getSettingValue('fastcomments_stream_last_fetch_timestamp');
        let hasMore = true;
        const startedAt = Date.now();
        while (hasMore && Date.now() - startedAt < 30 * 1000) {
            const rawIntegrationEventsResponse = await this.makeHTTPRequest('GET', `${this.baseUrl}/events?token=${token}&fromDateTime=${fromDateTime ? fromDateTime : 0}`);
            /** @type {FastCommentsEventStreamResponse} **/
            const response = JSON.parse(rawIntegrationEventsResponse.responseBody);
            if (response.status === 'success') {
                this.log('info', `Got events count: ${response.events.length}`);
                if (response.events && response.events.length > 0) {
                    await this.handleEvents(response.events);
                    fromDateTime = response.events[response.events.length - 1].createdAt;
                    await this.setSettingValue('fastcomments_stream_last_fetch_timestamp', fromDateTime);
                } else {
                    break;
                }
                hasMore = response.hasMore;
            } else {
                this.log('error', `Failed to get events: ${rawIntegrationEventsResponse}`);
                break;
            }
        }
    }

    async commandSendComments(token) {
        this.log('debug', 'Starting to send comments');
        let lastSendDate = await this.getSettingValue('fastcomments_stream_last_send_timestamp');
        const startedAt = Date.now();
        let hasMore = true;
        let countSyncedSoFar = 0;
        const commentCount = await this.getCommentCount();
        while (hasMore && Date.now() - startedAt < 30 * 1000) {
            const getCommentsResponse = await this.getComments(lastSendDate ? lastSendDate : 0);
            if (getCommentsResponse.status === 'success') {
                this.log('info', `Got comments to send count=[${getCommentsResponse.comments.length}] hasMore=[${getCommentsResponse.hasMore}]`);
                if (getCommentsResponse.comments && getCommentsResponse.comments.length > 0) {
                    const httpResponse = await this.makeHTTPRequest('POST', `${this.baseUrl}/comments?token=${token}`, JSON.stringify({
                        countRemaining: commentCount - (getCommentsResponse.comments.length + countSyncedSoFar),
                        comments: getCommentsResponse.comments
                    }));
                    this.log('debug', `Got POST /comments response status code=[${httpResponse.responseStatusCode}]`);
                    const response = JSON.parse(httpResponse.responseBody);
                    if (response.status === 'success') {
                        const fromDateTime = new Date(getCommentsResponse.comments[getCommentsResponse.comments.length - 1].date).getTime();
                        lastSendDate = fromDateTime;
                        await this.setSettingValue('fastcomments_stream_last_send_timestamp', fromDateTime); // if we crash we can restart from this date
                        hasMore = getCommentsResponse.hasMore;
                        countSyncedSoFar += getCommentsResponse.comments.length;

                        if (!hasMore) {
                            await this.setSettingValue('fastcomments_sync_completed', true); // currently just for tests
                            break;
                        }
                    } else {
                        break;
                    }
                } else {
                    await this.setSettingValue('fastcomments_sync_completed', true); // currently just for tests
                    break;
                }
            } else {
                this.log('error', `Failed to get comments to send: status=[${getCommentsResponse.status}] comments=[${getCommentsResponse.comments}] hasMore=[${getCommentsResponse.hasMore}]`);
                break;
            }
        }
        this.log('debug', 'Done sending comments');
    }

}

module.exports = { FastCommentsIntegrationCore };
