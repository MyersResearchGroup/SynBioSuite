import { msalInstance } from "../auth/msalInit";

function mapOneDriveItemToObjectType(item) {
    if (item.isFolder) return "folder";

    const mime = item.file?.mimeType;
    const fileName = item.name.toLowerCase();
    const subdirectory = item.parentReference?.path; // Assuming parentReference gives folder path

    // Example subdirectories (you can adjust this list as needed)

    // Check for XML extension and check for the subdirectory path
    if (fileName.match(/\.xml$/) && subdirectory && subdirectory.includes("plasmids")) {
        return "synbio.object-type.plasmid";  // Match for plasmid XML files in the 'plasmids' subdirectory
    }

    // You can add more subdirectory checks for other object types here
    if (fileName.match(/\.json$/) && subdirectory && subdirectory.includes("assemblyPlans")) {
        return "synbio.object-type.assembly-plan";
    }

    if (fileName.match(/\.json$/) && subdirectory && subdirectory.includes("builds")) {
        return "synbio.object-type.build";
    }

    if (fileName.match(/\.xdc$/) && subdirectory && subdirectory.includes("xdc")) {
        return "synbio.object-type.experiment";
    }

    // MIME-based detection (for other file types)
    switch (mime) {
        case "application/json":
            return "synbio.object-type.json";
        case "text/xml":
            return "synbio.object-type.sbol";
        case "application/octet-stream":
            return "synbio.object-type.analysis";
        case "text/plain":
            return "synbio.object-type.text";
        default:
            return "unknown";
    }
}

export const fetchFilesAndFoldersFromOneDrive = async (parentFolderId) => {
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

    // Process the files and folders (including nested ones)
    const flattenAndMapItems = async (items) => {
        let flatItems = [];

        for (const item of items) {
            // First, map the item to its object type
            const mappedItem = mapOneDriveItemToObjectType(item);
            
            const flatItem = { ...item, objectType: mappedItem };

            // If it's a folder, we need to fetch its contents recursively
            if (item.folder) {
                const subfolderItems = await fetchFilesAndFoldersFromOneDrive(item.id);
                flatItems.push({ ...flatItem, files: subfolderItems });  // Attach subfolder items
            } else {
                // If it's a file, just add it directly
                flatItems.push(flatItem);
            }
        }

        return flatItems;
    };

    // Flatten the files and folders structure and map them
    const flatMappedItems = await flattenAndMapItems(data.value);
    console.log("Flattened and mapped items:", flatMappedItems); // Debugging

    return flatMappedItems;
};


export async function fetchFileFromOneDrive(fileId) {
    const token = await msalInstance.acquireTokenSilent({
        scopes: ['Files.ReadWrite', 'User.Read'],
    });

    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token.accessToken}`,
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch file from OneDrive');
    }

    // Return the response as a Blob (or you can also return as arrayBuffer or text depending on your use case)
    return await response.blob();
}

export async function saveFileToIndexedDB(fileId, fileContent) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("FileStorage", 1);

        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files', { keyPath: 'id' });
            }
        };

        request.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction('files', 'readwrite');
            const objectStore = transaction.objectStore('files');
            objectStore.put({ id: fileId, content: fileContent });

            transaction.oncomplete = function() {
                resolve();
            };

            transaction.onerror = function() {
                reject(new Error("Failed to save file to IndexedDB"));
            };
        };

        request.onerror = function() {
            reject(new Error("Failed to open IndexedDB"));
        };
    });
}

