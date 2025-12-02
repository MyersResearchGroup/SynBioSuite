import { msalInstance } from "./msalInit";

export const handleLogin = async () => {
  try{
    const response = await msalInstance.loginRedirect({
      scopes: ["Files.ReadWrite", "User.Read"],
    });
    msalInstance.setActiveAccount(response.account);
    console.log("Login successful:", response);
  } catch (error) {
    console.error("Login failed:", error);
  }
};
