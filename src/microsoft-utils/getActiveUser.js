import { msalInstance } from "./msal";

export async function getActiveUser() {
    let account = msalInstance.getActiveAccount();
    return account;
}