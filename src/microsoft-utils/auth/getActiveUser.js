import { msalInstance } from "./msalInit";

export async function getActiveUser() {
    let account = msalInstance.getActiveAccount();
    return account;
}