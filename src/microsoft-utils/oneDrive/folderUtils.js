import { msalInstance } from '../auth/msalInit';

export const checkFolderExists = async (parentFolderId, subdirectory) => {
    
    const token = await msalInstance.acquireTokenSilent({
        scopes: ['Files.ReadWrite', 'User.Read'],
    });
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${parentFolderId}/children`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token.accessToken}`,
        },
    });

    const data = await response.json();
    const folder = data.value.find(item => item.name === subdirectory && item.folder);
    return folder ? folder.id : null;
};

export const checkFileExists = async (folderId, fileName, token) => {
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
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

export const createFolder = async (parentFolderId, subdirectory) => {
    const token = await msalInstance.acquireTokenSilent({
        scopes: ['Files.ReadWrite', 'User.Read'],
    });
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${parentFolderId}/children`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token.accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: subdirectory,
            folder: {},
            "@microsoft.graph.conflictBehavior": "rename",
        }),
    });

    const data = await response.json();

    // If the folder was created successfully, return its ID
    if (response.ok) {
        return data.id;
    } else {
        // If the request failed, handle the error (throwing an error here)
        throw new Error(`Error creating folder: ${data.error.message}`);
    }
};