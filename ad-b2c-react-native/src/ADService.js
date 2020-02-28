/* eslint-disable camelcase */
import {RequestType} from './Constants';
import Result from './Result';

class ADService {
    init = props => {
        this.tenant = props.tenant;
        this.appId = props.appId;
        this.loginPolicy = props.loginPolicy;
        this.passwordResetPolicy = props.passwordResetPolicy;
        this.profileEditPolicy = props.profileEditPolicy;
        this.redirectURI = encodeURI(props.redirectURI);
        this.scope = encodeURI(`${this.appId} offline_access`);
        this.response_mode = 'query';
        // this.scope = "openid"
        this.tokenResult = {};
        this.secureStore = props.secureStore;
        this.baseUri = `https://${this.tenant}.b2clogin.cn/${this.tenant}.partner.onmschina.cn`;

        this.TokenTypeKey = 'tokenType';
        this.AccessTokenKey = 'accessToken';
        this.IdTokenKey = 'idToken';
        this.RefreshTokenKey = 'refreshToken';
        this.ExpiresOnKey = 'expiresOn';
    };

    logoutAsync = async () => {
        this.tokenResult = {};
        await Promise.all([
            this.secureStore.remove(this.TokenTypeKey),
            this.secureStore.remove(this.AccessTokenKey),
            this.secureStore.remove(this.IdTokenKey),
            this.secureStore.remove(this.RefreshTokenKey),
            this.secureStore.remove(this.ExpiresOnKey),

        ]);
    };

    isAuthenticAsync = async () => {
        const [
            tokenType,
            accessToken,
            refreshToken,
            idToken,
            expiresOn,
        ] = await Promise.all([
            this.secureStore.get(this.TokenTypeKey),
            this.secureStore.get(this.AccessTokenKey),
            this.secureStore.get(this.RefreshTokenKey),
            this.secureStore.get(this.IdTokenKey),
            this.secureStore.get(this.ExpiresOnKey),
        ]);

        this.tokenResult = {
            tokenType,
            accessToken,
            idToken,
            refreshToken,
            expiresOn: parseInt(expiresOn),
        };

        return this._isTokenValid(this.tokenResult);
    };

    _isTokenValid = tokenResult =>
        tokenResult && new Date().getTime() < tokenResult.expiresOn * 1000;

    getAccessTokenAsync = async () => {
        if (!this._isTokenValid(this.tokenResult)) {
            const result = await this.fetchAndSetTokenAsync(
                this.tokenResult.refreshToken,
                this.loginPolicy,
                true,
            );

            if (!result.isValid) {
                return result;
            }
        }

        return Result(
            true,
            `${this.tokenResult.tokenType} ${this.tokenResult.accessToken}`,
        );
    };

    getIdToken = () => this.tokenResult.idToken;

    fetchAndSetTokenAsync = async (authCode, policy, isRefreshTokenGrant) => {
        if (!authCode) {
            return Result(false, 'Empty auth code');
        }

        try {
            let params = {
                client_id: this.appId,
                scope: `${this.appId} offline_access`,
                redirect_uri: this.redirectURI,
            };

            if (isRefreshTokenGrant) {
                params.grant_type = 'refresh_token';
                params.refresh_token = authCode;
            } else {
                params.grant_type = 'authorization_code';
                params.code = authCode;
            }
            params.client_secret = 'xhz{b26L9U]}4:7u^$|w3_z3';

            const body = this.getFormUrlEncoded(params);
            const url = this._getStaticURI(policy, 'token');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body,
            });
            console.log('request with');
            console.log(url);
            console.log(body);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error_description);
            }

            await this._setTokenDataAsync(response);
            return Result(true);
        } catch (error) {
            return Result(false, error.message);
        }
    };

    _setTokenDataAsync = async response => {
        const res = await response.json();
        console.log('get request from /auth endpoint : ');
        console.log(response);
        console.log('json format of request from /auth endpoint : ');
        console.log(res);
        this.tokenResult = {
            tokenType: res.token_type,
            accessToken: res.access_token,
            idToken: res.id_token,
            refreshToken: res.refresh_token,
            expiresOn: res.expires_on,
        };

        await Promise.all(
            this.secureStore.set(this.TokenTypeKey, res.token_type.toString(), {accessible: 'AccessibleAlwaysThisDeviceOnly'}),
            this.secureStore.set(this.AccessTokenKey, res.access_token.toString(), {accessible: 'AccessibleAlwaysThisDeviceOnly'}),
            this.secureStore.set(this.RefreshTokenKey, res.expires_in.toString(), {accessible: 'AccessibleAlwaysThisDeviceOnly'}),
            this.secureStore.set(this.IdTokenKey, res.id_token.toString(), {accessible: 'AccessibleAlwaysThisDeviceOnly'}),
            this.secureStore.set(
                this.ExpiresOnKey,
                res.expires_on.toString(), {accessible: 'AccessibleAlwaysThisDeviceOnly'},
            ),
        );
    };

    getFormUrlEncoded = params =>
        Object.keys(params)
            .map(
                key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`,
            )
            .join('&');

    _getStaticURI = (policy, endPoint) => {
        let uri = `${this.baseUri}/${policy}/oauth2/v2.0/${endPoint}?`;
        if (endPoint === 'authorize') {
            uri += `client_id=${this.appId}`;
            uri += `&response_type=code`;
            uri += `&redirect_uri=${this.redirectURI}`;
            uri += '&response_mode=query';
            uri += `&scope=${this.scope}`;
            // uri += `&prompt=login`;
        }
        console.log(uri);
        return uri;
    };

    getLoginURI = () => this._getStaticURI(this.loginPolicy, 'authorize');

    getLogoutURI = () =>
        `${this.baseUri}/${this.loginPolicy}/oauth2/v2.0/logout?post_logout_redirect_uri=${this.redirectURI}`;

    getPasswordResetURI = () =>
        `${this._getStaticURI(this.passwordResetPolicy, 'authorize')}`;

    getProfileEditURI = () =>
        `${this._getStaticURI(this.profileEditPolicy, 'authorize')}`;

    getLoginFlowResult = url => {
        const params = this._getQueryParams(url);
        const {error_description, code} = params;

        let data = '';
        if (code) {
            data = code;
        } else {
            data = error_description;
        }

        return {
            requestType: this._getRequestType(url, params),
            data,
        };
    };

    _getRequestType = (
        url,
        {error_description, code, post_logout_redirect_uri},
    ) => {
        if (code) {
            return RequestType.Code;
        }

        if (post_logout_redirect_uri === this.redirectURI) {
            return RequestType.Logout;
        }
        if (error_description) {
            if (error_description.indexOf('AADB2C90118') !== -1) {
                return RequestType.PasswordReset;
            }

            if (error_description.indexOf('AADB2C90091') !== -1) {
                return RequestType.Cancelled;
            }
        }

        // always keep this check last
        if (url.indexOf(this.redirectURI) === 0) {
            return RequestType.Ignore;
        }

        return RequestType.Other;
    };

    _getQueryParams = url => {
        const regex = /[?&]([^=#]+)=([^&#]*)/g;
        const params = {};
        let match;
        while ((match = regex.exec(url))) {
            params[match[1]] = match[2];
        }
        return params;
    };
}

const adService = new ADService();
export default adService;
export {ADService};
