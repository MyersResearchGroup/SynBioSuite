import { msalInstance } from "./msal";

export const handleLogin = async () => {
  await msalInstance.loginRedirect({
    scopes: [
      "User.ReadWrite"
    ],
  });
};

export const handleLogout = () =>
  msalInstance.logoutRedirect();