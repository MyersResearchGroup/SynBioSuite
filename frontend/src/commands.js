import store from "./redux/store"
import { isPanelOpen, panelsActions, serializePanel } from "./redux/hooks/panelsHooks"
import { workDirActions, writeToFileHandle, readFileFromPath } from "./redux/hooks/workingDirectoryHooks"
import { showErrorNotification } from "./modules/util"
import { showNotification } from "@mantine/notifications"
import { openUnifiedModal } from "./redux/slices/modalSlice"
import { MODAL_TYPES } from "./modules/unified_modal/unifiedModal"
import { upload_resource, CheckLogin } from "./API"


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

            const dirHandle = store.getState().workingDirectory.directoryHandle;
            const directory = file.id.split("/")[0];

            let jsonData = null;
            let tempDirectory = null;

            try {
                tempDirectory = await dirHandle.getDirectoryHandle(directory);
                const jsonFH = await tempDirectory.getFileHandle(file.name);
                const jsonText = await (await jsonFH.getFile()).text();
                jsonData = JSON.parse(jsonText);
            } catch (e) {
                showErrorNotification("Failed to read workflow file", e.message);
                return "Failed to read workflow file.";
            }

            const lastUpload = jsonData.uploads?.length
                ? jsonData.uploads[jsonData.uploads.length - 1]
                : null;

            if (!lastUpload?.selectedRepo || !lastUpload?.uri) {
                showErrorNotification("Cannot update", "No prior upload record with repository information found.");
                return "No prior upload record found.";
            }

            const selectedRepo = lastUpload.selectedRepo;
            const expectedEmail = lastUpload.userEmail || null;
            const collectionDisplayId = lastUpload.uri.split('/').slice(-2, -1)[0] || lastUpload.collectionName;
            const collectionName = lastUpload.collectionName;
            const collectionUri = lastUpload.uri;

            function getStoredToken() {
                try {
                    const stored = localStorage.getItem('SynbioHub');
                    if (!stored) return null;
                    const repos = JSON.parse(stored);
                    const entry = repos.find(r => r.value === selectedRepo);
                    return entry?.authtoken || null;
                } catch { return null; }
            }

            async function performUpdate(authToken) {
                return new Promise((resolve) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.style.display = 'none';
                    document.body.appendChild(input);

                    input.oncancel = () => {
                        document.body.removeChild(input);
                        showNotification({ title: "File update cancelled", message: "The file update was cancelled." });
                        resolve("File update cancelled.");
                    };

                    input.onchange = async (e) => {
                        const newFile = e.target.files[0];
                        document.body.removeChild(input);

                        if (!newFile) {
                            showErrorNotification("Unable to update", "No file selected");
                            return resolve("No file selected.");
                        }

                        const getExtension = (n) => { const m = n.match(/\.[^/.]+$/); return m ? m[0] : ''; };
                        const existingFileName = jsonData.file ? jsonData.file.split('/').pop() : null;

                        if (existingFileName) {
                            const originalExt = getExtension(existingFileName);
                            const newFileExt = getExtension(newFile.name);
                            if (originalExt !== newFileExt) {
                                showErrorNotification("File type mismatch", `Expected ${originalExt} but got ${newFileExt}`);
                                return resolve(`File type mismatch. Expected ${originalExt} but got ${newFileExt}`);
                            }
                        }

                        try {
                            const uploadsDir = await tempDirectory.getDirectoryHandle('uploads', { create: true });

                            const newFileName = newFile.name;
                            const sameFilename = existingFileName && existingFileName === newFileName;

                            const stagingName = sameFilename ? `__tmp__${newFileName}` : newFileName;
                            const stagingFH = await uploadsDir.getFileHandle(stagingName, { create: true });
                            const writable = await stagingFH.createWritable();
                            await writable.write(newFile);
                            await writable.close();

                            const newFilePath = `${directory}/uploads/${newFileName}`;

                            // TODO: Remove once SBS Server implementation works correctly
                            try{ await upload_resource(
                                newFilePath,
                                selectedRepo,
                                authToken,
                                collectionDisplayId,
                                "",
                                dirHandle,
                                3
                            );} catch (e) {
                            }

                            if (sameFilename) {
                                try { await uploadsDir.removeEntry(existingFileName); } catch {}
                                const finalFH = await uploadsDir.getFileHandle(newFileName, { create: true });
                                const finalWritable = await finalFH.createWritable();
                                await finalWritable.write(newFile);
                                await finalWritable.close();
                                try { await uploadsDir.removeEntry(stagingName); } catch {}
                            } else if (existingFileName) {
                                try { await uploadsDir.removeEntry(existingFileName); } catch {}
                            }

                            const updateEntry = {
                                collectionName,
                                uri: collectionUri,
                                file: newFilePath,
                                date: new Date().toLocaleString(undefined, { timeZoneName: 'short' }),
                                selectedRepo,
                                userEmail: expectedEmail,
                                type: 'update',
                            };

                            const updatedJson = {
                                ...jsonData,
                                file: newFilePath,
                                uploads: [...(jsonData.uploads ?? []), updateEntry],
                            };

                            const jsonFH = await tempDirectory.getFileHandle(file.name);
                            await writeToFileHandle(jsonFH, JSON.stringify(updatedJson));

                            // Sync Redux panel state so PanelSaver doesn't overwrite with stale data
                            if (isPanelOpen(file.id)) {
                                store.dispatch(panelsActions.updateOne({
                                    id: file.id,
                                    changes: {
                                        file: newFilePath,
                                        uploads: updatedJson.uploads,
                                    }
                                }))
                            }

                            showNotification({
                                title: "File updated",
                                message: `${newFileName} uploaded successfully to ${collectionName}.`,
                                color: "green",
                            });

                            resolve("File updated successfully.");
                        } catch (err) {
                            showErrorNotification("Failed to update file", err.message);
                            resolve("Failed to update file: " + err.message);
                        }
                    };

                    input.click();
                });
            }

            const storedToken = getStoredToken();
            if (storedToken) {
                try {
                    const loginResult = await CheckLogin(selectedRepo, storedToken);
                    if (loginResult.valid) {
                        const actualEmail = loginResult.profile?.email || '';
                        if (!expectedEmail || actualEmail.toLowerCase() === expectedEmail.toLowerCase()) {
                            return await performUpdate(storedToken);
                        }
                    }
                } catch {}
            }

            return new Promise((resolve) => {
                store.dispatch(openUnifiedModal({
                    modalType: MODAL_TYPES.COLLECTION_BROWSER,
                    allowedModals: [
                        MODAL_TYPES.SBH_CREDENTIAL_CHECK,
                        MODAL_TYPES.COLLECTION_BROWSER,
                        MODAL_TYPES.SBH_LOGIN,
                        MODAL_TYPES.CREATE_COLLECTION,
                    ],
                    props: {
                        selectedRepo,
                        expectedEmail,
                        skipRepositorySelection: true,
                        silentCredentialCheck: true,
                        multiSelect: false,
                        rootOnly: true,
                    },
                    callback: async (result) => {
                        if (!result?.completed) {
                            showNotification({ title: "Update cancelled", message: "Authentication was cancelled." });
                            return resolve("Update cancelled.");
                        }

                        const authToken = result.authToken;
                        if (!authToken) {
                            showErrorNotification("Authentication failed", "Could not obtain a valid auth token.");
                            return resolve("Authentication failed.");
                        }

                        resolve(await performUpdate(authToken));
                    },
                }));
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