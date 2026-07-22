import { PublicClientApplication, LogLevel } from "@azure/msal-browser";

const clientId = import.meta.env.VITE_CLIENT_ID?.trim();

export const isMicrosoftAuthConfigured = Boolean(clientId);

const unavailable = () => Promise.reject(new Error(
  'Microsoft sign-in is not configured. Set VITE_CLIENT_ID to enable OneDrive features.',
));

const disabledMicrosoftClient = Object.freeze({
  initialize: async () => undefined,
  handleRedirectPromise: async () => null,
  getActiveAccount: () => null,
  setActiveAccount: () => undefined,
  loginRedirect: unavailable,
  logoutRedirect: unavailable,
  clearCache: async () => undefined,
  acquireTokenSilent: unavailable,
});

export const msalInstance = isMicrosoftAuthConfigured
  ? new PublicClientApplication({
    auth: {
      clientId,
      authority: "https://login.microsoftonline.com/consumers",
      // TODO: Use environment variable instead of hardcoded dev
      redirectUri: "http://localhost:3000/onedrive",
      postLogoutRedirectUri: "http://localhost:3000/",
      navigateToLoginRequestUrl: false,
    },
    cache: {
      cacheLocation: "sessionStorage",
      storeAuthStateInCookie: true,
    },
    system: {
      loggerOptions: {
        logLevel: LogLevel.Error,
        loggerCallback: () => {},
      },
    },
  })
  : disabledMicrosoftClient;
