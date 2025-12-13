import { msalInstance } from '../auth/msalInit';
import { checkFolderExists, createFolder } from './folderUtils';

export const createFileInOneDrive = async (parentFolderId, fileName, objectType) => {
    // Get token from logged in user
    const token = await msalInstance.acquireTokenSilent({
        scopes: ['Files.ReadWrite', 'User.Read'],
    });

    // Check if subdirectory needs to exist according to local storage directory structure
    // If it needs to exist, check if it exists and create it if it doesn't
    const subdirectory = objectType?.subdirectory ? `${objectType.subdirectory}` : '';
    let folderId = parentFolderId;
    if (subdirectory) {
        folderId = await checkFolderExists(parentFolderId, subdirectory);
    
        if (!folderId) {
            folderId = await createFolder(parentFolderId, subdirectory);
        }
    }
    // Set the extension type based on the object type
    const extension = objectType?.extension ? objectType.extension : '';

    // Create an empty file in the specified folder in OneDrive
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

    // Handle the response
    // TODO: Improve error handling. Maybe show a notification in the UI
    if (response.ok) {
        const fileDetails = await response.json();
        console.log('Empty file created successfully:', fileDetails);
    } else {
        const errorDetails = await response.json();
        console.error('Error creating empty file:', errorDetails);
    }
};