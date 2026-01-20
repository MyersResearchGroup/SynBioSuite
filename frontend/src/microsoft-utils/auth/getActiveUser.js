import { msalInstance } from "./msalInit";

export async function getActiveUser() {
    return msalInstance.getActiveAccount();
}