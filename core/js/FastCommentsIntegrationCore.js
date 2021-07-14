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

export default class FastCommentsIntegrationCore {
    constructor(integrationType, baseUrl = 'https://fastcomments.com/integrations/v1/') {
        if (!integrationType) {
            throw new Error('An integration type is required! Ex: new FastCommentsIntegrationCore("wordpress")');
        }
        this.integrationType = integrationType;
        this.baseUrl = baseUrl;
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
     * Create a UUID. Implement using the UUID library of your choice.
     * @return {string}
     */
    createUUID() {
        throw new Error('Implement me! createUUID');
    }

    /**
     *
     * @param {string} settingName
     * @return {Promise<string|number|boolean|null|undefined>}
     */
    async getSettingValue(settingName) {
        throw new Error('Implement me! getSettingValue');
    }

    /**
     *
     * @param {*} settingName
     * @param {string|number|boolean|null|undefined} settingValue
     * @return {Promise<void>}
     */
    async setSettingValue(settingName, settingValue) {
        throw new Error('Implement me! setSettingValue');
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
        throw new Error('Implement me! makeHTTPRequest');
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
        throw new Error('Implement me! makeHTTPRequest');
    }

    /**
     *
     * @return {Promise<string>}
     */
    async getLoginURL() {
        throw new Error('Implement me! getLoginURL');
    }

    /**
     *
     * @return {Promise<string>}
     */
    async getLogoutURL() {
        throw new Error('Implement me! getLogoutURL');
    }

    /**
     * @param {Array.<FastCommentsEventStreamItem>} events
     * @return {Promise<void>}
     */
    async handleEvents(events) {
        throw new Error('Implement me! handleEvents');
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
            nextStateMachine = await nextStateMachine();
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
            const rawTokenUpsertResponse = await this.makeHTTPRequest('PUT', `${this.baseUrl}/token?token=${token}&integrationType=${this.integrationType}`);
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
            this.getSettingValue('fastcomments_stream_last_fetch_date')
        ]);
        const rawIntegrationStreamResponse = await this.makeHTTPRequest('GET', `${this.baseUrl}/commands?token=${token}&lastFetchDate=${lastFetchDate}`);
        this.log('debug', 'Stream response status: ' + rawIntegrationStreamResponse.responseStatus);
        if (rawIntegrationStreamResponse.responseStatus === 200) {
            /** @type {FastCommentsCommandStreamResponse} **/
            const response = JSON.parse(rawIntegrationStreamResponse.responseBody);
            if (response.status === 'success' && response.commands) {
                for (const command of response.commands) {
                    switch (command.command) {
                        case 'FetchEvents':
                            let fromDateTime = lastFetchDate;
                            let hasMore = true;
                            const startedAt = Date.now();
                            while(hasMore && Date.now() - startedAt < 30 * 1000) {
                                const rawIntegrationEventsResponse = await this.makeHTTPRequest('GET', `${this.baseUrl}/events?token=${token}&fromDateTime=${fromDateTime}`);
                                /** @type {FastCommentsEventStreamResponse} **/
                                const response = JSON.parse(rawIntegrationEventsResponse.responseBody);
                                if (response.status === 'success') {
                                    this.log('error', `Got events count: ${response.events.length}`);
                                    await this.handleEvents(response.events);
                                    if (response.events && response.events.length > 0) {
                                        fromDateTime = response.events[response.events.length - 1].createdAt;
                                        await this.setSettingValue('fastcomments_stream_last_fetch_date', fromDateTime);
                                    }
                                } else {
                                    this.log('error', `Failed to get events: ${rawIntegrationEventsResponse}`);
                                    break;
                                }
                            }
                            break;
                        case 'SendComments':
                            // limit us to sending for 30 seconds, maintaining last_comment_sent_timestamp with each send
                            // log "sending x comments"
                            // if no more comments:
                            //  pass "hasMore = false", and the server should stop telling us SendComments
                            //  await this.setSettingValue('fastcomments_stream_last_fetch_date', now);
                            // tell server
                            // else
                            break;
                    }
                }
            }
        }

        return null;
    }

}
