import { PublicClientApplication, LogLevel } from "@azure/msal-browser";

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: import.meta.env.VITE_CLIENT_ID,
    authority: "https://login.microsoftonline.com/common",
    redirectUri: "http://localhost:3000/cloud-home", 
    postLogoutRedirectUri: "http://localhost:3000/",
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Error,
      loggerCallback: () => {},
    },
  },
});
