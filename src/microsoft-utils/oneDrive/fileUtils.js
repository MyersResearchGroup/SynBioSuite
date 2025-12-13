import { msalInstance } from '../auth/msalInit';

const checkIfFileExists = async (folderId, fileName) => {
    const token = await msalInstance.acquireTokenSilent({
        scopes: ['Files.ReadWrite', 'User.Read'],
    });
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token.accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error('Error checking if file exists');
    }

    const data = await response.json();
    
    // Find file by name in the folder
    const file = data.value.find(item => item.name === fileName);
    return file ? file.id : null;  // Return file ID if exists, otherwise null
};