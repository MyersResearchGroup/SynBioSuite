import { msalInstance } from "./msal";

export const handleLogin = async () => {
  msalInstance.loginRedirect({
    scopes: ["openid", "profile", "offline_access"],
  });
};
