import store from "./redux/store"
import { isPanelOpen, panelsActions, serializePanel } from "./redux/hooks/panelsHooks"
import { workDirActions, writeToFileHandle } from "./redux/hooks/workingDirectoryHooks"
import { useOpenPanel } from "./redux/hooks/panelsHooks"
import { showErrorNotification } from "./modules/util"
import { showNotification } from "@mantine/notifications"


export default {
    FileDelete: {
        id: createId('file-delete'),
        title: "Delete File",
        shortTitle: "Delete",
        description: "Delete a file",
        color: "red",
        arguments: [
            {
                name: "fileNameOrId",
                prompt: "Enter the file name or ID"
            }
        ],
        execute: async fileNameOrId => {
            // try to find file by ID first, then by name
            const file = findFileByNameOrId(fileNameOrId)
            // quit if this file doesn't exist
            if (!file)
                return "File doesn't exist."
            
            // delete file from disk, try to see if in subdirectory first else delete from root
            const directory = file.id.split("/")[0]
            try {
                const tempDirectory = await store.getState().workingDirectory.directoryHandle.getDirectoryHandle(directory);
                await tempDirectory.removeEntry(file.name);

                try {
                    const uploadsDir = await tempDirectory.getDirectoryHandle('uploads');
                    const baseName = file.name.replace(/\.[^/.]+$/, "");
                    
                    for await (const entry of uploadsDir.values()) {
                        if (entry.kind === 'file' && entry.name.startsWith(baseName + '.')) {
                            await uploadsDir.removeEntry(entry.name);
                        }
                    }
                } catch (e) {
                }
            } catch {
                await store.getState().workingDirectory.directoryHandle?.removeEntry(file.name);
            }

            // close panel if it's open
            store.dispatch(panelsActions.closePanel(file.id))

            // remove file from store
            store.dispatch(workDirActions.removeFile(file.id))
        }
    },

    FileSave: {
        id: createId("file-save"),
        title: "Save File",
        shortTitle: "Save",
        description: "Save a file",
        arguments: [
            {
                name: "fileNameOrId",
                prompt: "Enter the file name or ID"
            }
        ],
        execute: async fileNameOrId => {
            // try to find file by ID first, then by name
            const file = findFileByNameOrId(fileNameOrId)

            // quit if this file doesn't exist
            if (!file)
                return "File doesn't exist."

            // make sure panel is open
            if(!isPanelOpen(file.id))
                return "Panel isn't open."

            // save
            await writeToFileHandle(file, serializePanel(file.id))
        }
    },

    FileDownload: {
        id: createId("file-download"),
        title: "Download File",
        shortTitle: "Download",
        description: "Download a file",
        arguments: [
            {
                name: "fileNameOrId",
                prompt: "Enter the file name or ID"
            }
        ],
        execute: async fileNameOrId => {
            const file = findFileByNameOrId(fileNameOrId);
            if (!file) return "File doesn't exist.";

            const state = store.getState().workingDirectory;
            let fileData = state.entities[file.id]?.data;
            let downloadName = file.name;

            if (!fileData) {
                const dirHandle = state.directoryHandle;
                if (dirHandle && typeof dirHandle.getFileHandle === 'function') {
                    try {
                        const parts = file.id.split('/');
                        let cur = dirHandle;
                        
                        for (let i = 0; i < parts.length - 1; i++) {
                            cur = await cur.getDirectoryHandle(parts[i]);
                        }

                        let uploadsDir;

                        try {
                            uploadsDir = await cur.getDirectoryHandle('uploads');
                        } catch (e) {
                            uploadsDir = null;
                        }
                        
                        if (uploadsDir) {
                            const baseName = file.name.replace(/\.[^/.]+$/, "");
                            let foundUpload = null;
                            
                            for await (const entry of uploadsDir.values()) {
                                if (entry.kind === 'file' && entry.name.replace(/\.[^/.]+$/, "") === baseName) {
                                    foundUpload = entry;
                                    break;
                                }
                            }
                            
                            if (foundUpload) {
                                const fh = await uploadsDir.getFileHandle(foundUpload.name);
                                fileData = await fh.getFile();
                                downloadName = foundUpload.name;
                            }
                        }

                        // If not found in uploads, fallback to original file
                        if (!fileData) {
                            const fh = await cur.getFileHandle(parts[parts.length - 1]);
                            fileData = await fh.getFile();
                        }
                    } catch (err) {
                        console.warn('Failed to read file from directoryHandle', err);
                    }
                } else {
                    console.warn('No usable directoryHandle in store. directoryHandle:', dirHandle);
                }
            }

            if (!fileData) {
                console.log("File data not found.");
                return "File data not found.";
            }

            const blob = typeof fileData === "string" ? new Blob([fileData], { type: "text/plain" }) : fileData;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = downloadName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    },
    FileUpdate: {
        id: createId('file-update'),
        title: "Update File",
        shortTitle: "Update",
        description: "Replace a file in the uploads subdirectory with a new one",
        arguments: [
            {
                name: "fileNameOrId",
                prompt: "Enter the file name or ID"
            }
        ],
        execute: async fileNameOrId => {
            const file = findFileByNameOrId(fileNameOrId);
            if (!file) return "File doesn't exist.";

            // Create a file input element
            const input = document.createElement('input');
            input.type = 'file';
            input.style.display = 'none';
            document.body.appendChild(input);

            // Return a promise that resolves when file is selected
            return new Promise((resolve, reject) => {
                input.onchange = async (e) => {
                    const newFile = e.target.files[0];
                    if (!newFile) {
                        document.body.removeChild(input);
                        showErrorNotification("Unable to update", "No file selected");
                        return resolve("No file selected.");
                    }

                    // Get file extensions
                    const getExtension = (filename) => {
                        const match = filename.match(/\.[^/.]+$/);
                        return match ? match[0] : '';
                    };

                    const originalExt = getExtension(file.name);
                    const newFileExt = getExtension(newFile.name);

                    // Verify extensions match
                    if (originalExt !== newFileExt) {
                        document.body.removeChild(input);
                        showErrorNotification("File type mismatch", `Expected ${originalExt} but got ${newFileExt}`);
                        return resolve(`File type mismatch. Expected ${originalExt} but got ${newFileExt}`);
                    }

                    const directory = file.id.split("/")[0];
                    try {
                        const tempDirectory = await store.getState().workingDirectory.directoryHandle.getDirectoryHandle(directory);
                        
                        // Get or create uploads directory
                        let uploadsDir;
                        try {
                            uploadsDir = await tempDirectory.getDirectoryHandle('uploads');
                        } catch {
                            uploadsDir = await tempDirectory.getDirectoryHandle('uploads', { create: true });
                        }

                        // Remove old upload file(s) for this base name
                        const baseName = file.name.replace(/\.[^/.]+$/, "");
                        for await (const entry of uploadsDir.values()) {
                            if (entry.kind === 'file' && entry.name.startsWith(baseName + '.')) {
                                await uploadsDir.removeEntry(entry.name);
                            }
                        }

                        // Write the new file with the original file's name
                        const targetFileName = baseName + originalExt;
                        const newFileHandle = await uploadsDir.getFileHandle(targetFileName, { create: true });
                        const writable = await newFileHandle.createWritable();
                        await writable.write(newFile);
                        await writable.close();

                        document.body.removeChild(input);
                        resolve("File updated successfully.");
                    } catch (e) {
                        document.body.removeChild(input);
                        showErrorNotification("Failed to update file", e.message);
                        reject("Failed to update file in uploads subdirectory: " + e.message);
                    }
                };

                input.oncancel = () => {
                    document.body.removeChild(input);
                    showNotification()
                    resolve("File update cancelled.");
                };

                // Trigger the file picker
                input.click();
            });
        }
    },
}




// Utility 

function createId(name) {
    return "synbio.command." + name
}

function findFileByNameOrId(idOrName) {
    return store.getState().workingDirectory.entities[idOrName]
        || Object.values(store.getState().workingDirectory.entities).find(f => f.name == idOrName)
}