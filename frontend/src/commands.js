import store from "./redux/store"
import { isPanelOpen, panelsActions, serializePanel } from "./redux/hooks/panelsHooks"
import { workDirActions, writeToFileHandle, readFileFromPath } from "./redux/hooks/workingDirectoryHooks"
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
            const file = findFileByNameOrId(fileNameOrId)
            if (!file)
                return "File doesn't exist."
            
            const dirHandle = store.getState().workingDirectory.directoryHandle
            const directory = file.id.split("/")[0]

            try {
                const tempDirectory = await dirHandle.getDirectoryHandle(directory);

                let uploadedFilePath = null;
                try {
                    const jsonFH = await tempDirectory.getFileHandle(file.name);
                    const jsonText = await (await jsonFH.getFile()).text();
                    const jsonData = JSON.parse(jsonText);
                    uploadedFilePath = jsonData.file || null;
                } catch (e) {}

                await tempDirectory.removeEntry(file.name);

                try {
                    if (uploadedFilePath) {
                        const uploadsDir = await tempDirectory.getDirectoryHandle('uploads');
                        const uploadFileName = uploadedFilePath.split('/').pop();
                        await uploadsDir.removeEntry(uploadFileName);
                    }
                } catch (e) {}
            } catch {
                await dirHandle?.removeEntry(file.name);
            }

            store.dispatch(panelsActions.closePanel(file.id))
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
            const file = findFileByNameOrId(fileNameOrId)
            if (!file)
                return "File doesn't exist."

            if(!isPanelOpen(file.id))
                return "Panel isn't open."

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
                        const jsonFH = await cur.getFileHandle(parts[parts.length - 1]);
                        const jsonText = await (await jsonFH.getFile()).text();
                        const jsonData = JSON.parse(jsonText);

                        if (jsonData.file) {
                            fileData = await readFileFromPath(dirHandle, jsonData.file);
                            downloadName = jsonData.file.split('/').pop();
                        } else {
                            fileData = await jsonFH.getFile();
                        }
                    } catch (err) {
                        try {
                            const parts = file.id.split('/');
                            let cur = dirHandle;
                            for (let i = 0; i < parts.length - 1; i++) {
                                cur = await cur.getDirectoryHandle(parts[i]);
                            }

                            let uploadsDir = null;
                            try { uploadsDir = await cur.getDirectoryHandle('uploads'); } catch (e) {}

                            if (uploadsDir) {
                                const baseName = file.name.replace(/\.[^/.]+$/, "");
                                for await (const entry of uploadsDir.values()) {
                                    if (entry.kind === 'file' && entry.name.replace(/\.[^/.]+$/, "") === baseName) {
                                        const fh = await uploadsDir.getFileHandle(entry.name);
                                        fileData = await fh.getFile();
                                        downloadName = entry.name;
                                        break;
                                    }
                                }
                            }

                            if (!fileData) {
                                const fh = await cur.getFileHandle(parts[parts.length - 1]);
                                fileData = await fh.getFile();
                            }
                        } catch (fallbackErr) {
                            console.warn('Failed to read file from directoryHandle', fallbackErr);
                        }
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

            const input = document.createElement('input');
            input.type = 'file';
            input.style.display = 'none';
            document.body.appendChild(input);

            return new Promise((resolve, reject) => {
                input.onchange = async (e) => {
                    const newFile = e.target.files[0];
                    if (!newFile) {
                        document.body.removeChild(input);
                        showErrorNotification("Unable to update", "No file selected");
                        return resolve("No file selected.");
                    }

                    const getExtension = (filename) => {
                        const match = filename.match(/\.[^/.]+$/);
                        return match ? match[0] : '';
                    };

                    const directory = file.id.split("/")[0];
                    try {
                        const tempDirectory = await store.getState().workingDirectory.directoryHandle.getDirectoryHandle(directory);

                        let existingFileName = null;
                        try {
                            const jsonFH = await tempDirectory.getFileHandle(file.name);
                            const jsonText = await (await jsonFH.getFile()).text();
                            const jsonData = JSON.parse(jsonText);
                            existingFileName = jsonData.file ? jsonData.file.split('/').pop() : null;
                        } catch (e) {}

                        let uploadsDir;
                        try {
                            uploadsDir = await tempDirectory.getDirectoryHandle('uploads');
                        } catch {
                            uploadsDir = await tempDirectory.getDirectoryHandle('uploads', { create: true });
                        }

                        if (existingFileName) {
                            const getExtension = (n) => { const m = n.match(/\.[^/.]+$/); return m ? m[0] : ''; };
                            const originalExt = getExtension(existingFileName);
                            const newFileExt = getExtension(newFile.name);

                            if (originalExt !== newFileExt) {
                                document.body.removeChild(input);
                                showErrorNotification("File type mismatch", `Expected ${originalExt} but got ${newFileExt}`);
                                return resolve(`File type mismatch. Expected ${originalExt} but got ${newFileExt}`);
                            }

                            try { await uploadsDir.removeEntry(existingFileName); } catch {}

                            const newFileHandle = await uploadsDir.getFileHandle(existingFileName, { create: true });
                            const writable = await newFileHandle.createWritable();
                            await writable.write(newFile);
                            await writable.close();

                            document.body.removeChild(input);
                            resolve("File updated successfully.");
                            return;
                        }
                    } catch (e) {
                        document.body.removeChild(input);
                        showErrorNotification("Failed to update file", e.message);
                        reject("Failed to update file in uploads subdirectory: " + e.message);
                    }
                };

                input.oncancel = () => {
                    document.body.removeChild(input);
                    showNotification({
                        title: "File update cancelled",
                        message: "The file update was cancelled.",
                    });
                    resolve("File update cancelled.");
                };

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