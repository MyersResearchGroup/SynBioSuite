import { msalInstance } from '../auth/msalInit';
import { checkFolderExists, createFolder } from './folderUtils';

export const uploadOneDriveFile = async (parentFolderId, fileName, objectType, contents) => {
    // Note this only supports uploading files of up to 250 MB
    const token = await msalInstance.acquireTokenSilent({
        scopes: ['Files.ReadWrite', 'User.Read'],
    });
    const subdirectory = objectType?.subdirectory ? `${objectType.subdirectory}` : '';
    let folderId = parentFolderId;
    if (subdirectory) {
        folderId = await checkFolderExists(parentFolderId, subdirectory);
    
        // If the folder doesn't exist, create it
        if (!folderId) {
            folderId = await createFolder(parentFolderId, subdirectory);
        }
    }
    const extension = objectType?.extension ? objectType.extension : '';
    const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: `${fileName}${extension}`, 
                file: {}, 
            }),
        }
    );

    if (response.ok) {
        const fileDetails = await response.json();
    } else {
        const errorDetails = await response.json();
        console.error('Error creating empty file:', errorDetails);
    }
};