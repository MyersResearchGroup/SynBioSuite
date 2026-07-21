export const AUTH_ERROR_CODES = Object.freeze({
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    REFRESH_FAILED: 'REFRESH_FAILED',
    NETWORK_ERROR: 'NETWORK_ERROR',
    PROVIDER_ERROR: 'PROVIDER_ERROR',
});

export class AuthProviderError extends Error {
    constructor(code, message, { provider, operation, status, cause } = {}) {
        super(message, cause ? { cause } : undefined);
        this.name = 'AuthProviderError';
        this.code = code;
        this.provider = provider;
        this.operation = operation;
        this.status = status;
    }
}

export function normalizeAuthError(error, { provider, operation }) {
    if (error instanceof AuthProviderError) return error;

    const status = error?.response?.status ?? error?.status;
    let code = AUTH_ERROR_CODES.PROVIDER_ERROR;
    let message = `${provider} authentication request failed.`;

    if (status === 401 || status === 403) {
        if (operation === 'login') {
            code = AUTH_ERROR_CODES.INVALID_CREDENTIALS;
            message = 'The supplied credentials were rejected.';
        } else if (operation === 'refresh') {
            code = AUTH_ERROR_CODES.REFRESH_FAILED;
            message = 'The session could not be refreshed.';
        } else {
            code = AUTH_ERROR_CODES.TOKEN_EXPIRED;
            message = 'The session is missing, invalid, or expired.';
        }
    } else if (!error?.response && (error?.request || error instanceof TypeError)) {
        code = AUTH_ERROR_CODES.NETWORK_ERROR;
        message = `The ${provider} service could not be reached.`;
    }

    return new AuthProviderError(code, message, {
        provider,
        operation,
        status,
        cause: error,
    });
}
