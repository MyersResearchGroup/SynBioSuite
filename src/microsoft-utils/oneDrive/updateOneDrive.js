import { msalInstance } from '../auth/msalInit';

export const updateFileInOneDrive = async (fileId, content) => {
    // TODO: Update to include better error handling in case acquireTokenSilent fails. Do accross all utility files
    const token = await msalInstance.acquireTokenSilent({
        scopes: ['Files.ReadWrite', 'User.Read'],
    });

    // TODO: Check if file exists before updating?

    // Update the specified file in OneDrive with new content
    const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`,
        {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token.accessToken}`,
            },
            body: content,
        }
    );

    // TODO: Handle the response and errors appropriately
    const data = await response.json();
};
