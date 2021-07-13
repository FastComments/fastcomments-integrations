export default class FastCommentsIntegrationCore {
    constructor() {
    }

    /**
     *
     * @param {string} settingName
     * @return {Promise<*>}
     */
    async getSettingValue(settingName) {
        throw new Error('Implement me! getSettingValue');
    }

    /**
     *
     * @param {*} settingName
     * @param {*} settingValue
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
     * @param {string} url
     * @param {string} method
     * @param {string} body
     * @return {Promise<HTTPResponse>}
     */
    async makeHTTPRequest(url, method, body) {
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

    async getLoginURL() {
        throw new Error('Implement me! getLoginURL');
    }

    async getLogoutURL() {
        throw new Error('Implement me! getLogoutURL');
    }

    async getConfig(timestamp, urlId, url, isReadonly) {
        const [ ssoKey, tenantId ] = await Promise.all([
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

    /**
     * Base64 encoding mechanism can vary depending on VM/env, so define your own if needed.
     * This impl. works with NodeJS.
     * @param {string} stringValue
     * @return {string}
     */
    base64Encode(stringValue) {
        return Buffer.from(stringValue).toString('base64');
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
        const verificationHash = hash_hmac('sha256', timestamp . userDataJSONBase64, ssoKey);

        result.userDataJSONBase64 = userDataJSONBase64;
        result.verificationHash = verificationHash;

        const [ loginURL, logoutURL ] = await Promise.all([
            this.getLoginURL(),
            this.getLogoutURL()
        ]);

        result.loginURL = loginURL;
        result.logoutURL = logoutURL;

        return result;
    }

    async tick() {

    }

}
