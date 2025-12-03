import { msalInstance } from "./msalInit";

export const handleLogout = async() => {
  await msalInstance.logoutRedirect();
  await msalInstance.clearCache();
}
