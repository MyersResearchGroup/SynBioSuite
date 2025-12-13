import { msalInstance } from "./msalInit";

export const handleLogout = async() => {
  localStorage.clear();
  sessionStorage.clear();
  await msalInstance.logoutRedirect();
  await msalInstance.clearCache();
}
