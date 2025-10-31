import { msalInstance } from "./msal";

export const handleLogin = async () => {
  await msalInstance.loginRedirect({
    scopes: [
      "profile"
    ],
  });
};
