import { msalInstance } from "./msalInit";

export async function fetchFilesAndFoldersFromOneDrive (parentFolderId = 'root') {
    let token = null;
    try {
      token = await msalInstance.acquireTokenSilent({
        scopes: ['Files.ReadWrite', 'User.Read'],
      });
    } catch (error) {
      console.error("Token acquisition failed:", error);
      token = await msalInstance.acquireTokenRedirect({
        scopes: ['Files.ReadWrite', 'User.Read'],
      });
    }
    console.log("Fetched token:", token.accessToken);

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${parentFolderId}/children`,
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
        },
      }
    );

    const data = await response.json();
    return data.value;
  };