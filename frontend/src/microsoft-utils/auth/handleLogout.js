import { msalInstance } from "./msalInit";

export const handleLogout = async() => {
  // TODO: Implement actual logout
  // localStorage.clear();
  sessionStorage.clear();
  await msalInstance.logoutRedirect();
  await msalInstance.clearCache();
}
