import { msalInstance } from '../auth/msalInit';

export const deleteFileInOneDrive = async (fileId) => {
    // Get token from logged in user
    const token = await msalInstance.acquireTokenSilent({
        scopes: ['Files.ReadWrite', 'User.Read'],
    });

    // Delete the specified file in OneDrive
    const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`,
        {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token.accessToken}`,
            },
        }
    );

    // TODO: Handle the response and errors appropriately
    const data = await response.json();
};