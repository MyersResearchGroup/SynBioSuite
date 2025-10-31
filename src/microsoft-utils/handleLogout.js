import { msalInstance } from "./msal";

export const handleLogout = async() => {
  await msalInstance.logoutRedirect();
}
