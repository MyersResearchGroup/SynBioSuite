import store from "./redux/store"
import { isPanelOpen, panelsActions, panelsSelectors, serializePanel } from "./redux/hooks/panelsHooks"
import { workDirActions, writeToFileHandle, readFileFromPath, createFileInDirectory } from "./redux/hooks/workingDirectoryHooks"
import { ObjectTypes, BLANK_SBML } from "./objectTypes"
import { showErrorNotification } from "./modules/util"
import { showNotification } from "@mantine/notifications"
import { openUnifiedModal } from "./redux/slices/modalSlice"
import { MODAL_TYPES } from "./modules/unified_modal/unifiedModal"
import { upload_resource, CheckLogin } from "./API"
import * as XLSX from 'xlsx';


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

    FileView: {
        id: createId('file-view'),
        title: "View File",
        shortTitle: "View",
        description: "View Excel file",
        arguments: [
            {
                name: "fileNameOrId",
                prompt: "Enter the file name or ID"
            }
        ],
        execute: async fileNameOrId => {
            const file = findFileByNameOrId(fileNameOrId);
            if (!file) return "File doesn't exist.";

            const ext = file.name.split('.').pop().toLowerCase();
            const state = store.getState().workingDirectory;
            const isExcelExt = value => /\.(xls|xlsx|xlsm)$/i.test(value || "");
            const workflowDir = file.id.includes('/') ? file.id.split('/').slice(0, -1).join('/') : '';

            const normalizePath = value => value?.replace(/^\/+|\/+$/g, '') || '';

            const readFileFromId = async (targetId, preferredBaseDir = '') => {
                const entity = state.entities[targetId];
                if (entity?.data) {
                    return {
                        fileData: entity.data,
                        fileName: entity.name,
                        fileId: entity.id
                    };
                }

                const dirHandle = state.directoryHandle;
                if (!dirHandle || typeof dirHandle.getFileHandle !== 'function') {
                    return null;
                }

                try {
                    const parts = targetId.split('/');
                    let cur = dirHandle;
                    for (let i = 0; i < parts.length - 1; i++) {
                        cur = await cur.getDirectoryHandle(parts[i]);
                    }

                    const directHandle = await cur.getFileHandle(parts[parts.length - 1]);
                    const directFile = await directHandle.getFile();
                    return {
                        fileData: directFile,
                        fileName: parts[parts.length - 1],
                        fileId: targetId
                    };
                } catch {
                    return null;
                }
            };

            const readExcelFromIdWithUploadsFallback = async (targetId, preferredBaseDir = '') => {
                const normalizedTarget = normalizePath(targetId);
                const candidatePaths = [normalizedTarget];

                if (preferredBaseDir && !normalizedTarget.includes('/')) {
                    candidatePaths.push(`${preferredBaseDir}/${normalizedTarget}`);
                    candidatePaths.push(`${preferredBaseDir}/uploads/${normalizedTarget}`);
                }

                if (!normalizedTarget.includes('/')) {
                    candidatePaths.push(`uploads/${normalizedTarget}`);
                }

                const seen = new Set();
                for (const candidate of candidatePaths) {
                    if (!candidate || seen.has(candidate)) continue;
                    seen.add(candidate);

                    const direct = await readFileFromId(candidate, preferredBaseDir);
                    if (!direct) continue;

                    const targetExt = (direct.fileName.split('.').pop() || '').toLowerCase();
                    const baseName = direct.fileName.replace(/\.[^/.]+$/, "");
                    const dirHandle = state.directoryHandle;

                    if (dirHandle && typeof dirHandle.getFileHandle === 'function') {
                        try {
                            const parts = candidate.split('/');
                            let cur = dirHandle;
                            for (let i = 0; i < parts.length - 1; i++) {
                                cur = await cur.getDirectoryHandle(parts[i]);
                            }

                            let uploadsDir;
                            try {
                                uploadsDir = await cur.getDirectoryHandle('uploads');
                            } catch {
                                uploadsDir = null;
                            }

                            if (uploadsDir) {
                                for await (const entry of uploadsDir.values()) {
                                    if (entry.kind !== 'file') continue;
                                    const entryBase = entry.name.replace(/\.[^/.]+$/, "");
                                    const entryExt = (entry.name.split('.').pop() || '').toLowerCase();

                                    if (entryBase === baseName && entryExt === targetExt) {
                                        const fh = await uploadsDir.getFileHandle(entry.name);
                                        const uploadFile = await fh.getFile();
                                        return {
                                            fileData: uploadFile,
                                            fileName: entry.name,
                                            fileId: `${parts.slice(0, -1).join('/')}/uploads/${entry.name}`
                                        };
                                    }
                                }
                            }
                        } catch {
                        }
                    }

                    return direct;
                }

                return null;
            };

            let fileData = state.entities[file.id]?.data;
            let downloadName = file.name;
            let excelFileId = file.id;

            if (ext === 'json') {
                let jsonText = fileData;
                if (!jsonText) {
                    const jsonFile = await readFileFromId(file.id);
                    if (!jsonFile || !jsonFile.fileData) {
                        return "Could not read JSON file from disk.";
                    }
                    jsonText = await jsonFile.fileData.text();
                }

                let referencedPath = null;
                let excelFileName = null;
                let latestUploadPath = null;

                try {
                    const json = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
                    if (typeof json?.file === 'string' && isExcelExt(json.file)) {
                        referencedPath = json.file;
                    }

                    if (!referencedPath && Array.isArray(json?.uploads) && json.uploads.length > 0) {
                        const lastUpload = json.uploads[json.uploads.length - 1];
                        if (typeof lastUpload?.file === 'string' && isExcelExt(lastUpload.file)) {
                            latestUploadPath = lastUpload.file;
                        }
                    }

                    if (!referencedPath) {
                        const findExcelPath = obj => {
                            if (!obj || typeof obj !== 'object') return null;

                            if (typeof obj.file === 'string' && isExcelExt(obj.file)) {
                                return obj.file;
                            }

                            for (const k of Object.keys(obj)) {
                                const value = obj[k];
                                if (typeof value === 'string' && isExcelExt(value)) {
                                    return value;
                                }
                                if (value && typeof value === 'object') {
                                    const found = findExcelPath(value);
                                    if (found) return found;
                                }
                            }
                            return null;
                        };

                        referencedPath = findExcelPath(json);
                    }

                    if (referencedPath) {
                        const fileNameMatch = referencedPath.match(/([^/]+\.(xls|xlsx|xlsm))$/i);
                        excelFileName = fileNameMatch ? fileNameMatch[1] : null;
                    }
                } catch {
                    return "Could not parse JSON or find Excel file reference.";
                }

                if (!referencedPath && !excelFileName) {
                    referencedPath = latestUploadPath;
                }

                let resolvedExcel = null;

                if (referencedPath) {
                    resolvedExcel = await readExcelFromIdWithUploadsFallback(referencedPath, workflowDir);
                }

                if (!resolvedExcel && excelFileName) {
                    const excelEntity = Object.values(state.entities).find(entity => entity.name === excelFileName);
                    if (excelEntity) {
                        resolvedExcel = await readExcelFromIdWithUploadsFallback(excelEntity.id, workflowDir);
                    }
                }

                if (!resolvedExcel) {
                    return "Excel file referenced in JSON not found.";
                }

                fileData = resolvedExcel.fileData;
                downloadName = resolvedExcel.fileName;
                excelFileId = resolvedExcel.fileId;
            } else if (!(ext === 'xls' || ext === 'xlsx' || ext === 'xlsm')) {
                return "Only Excel files or intermediary JSON files can be viewed.";
            }

            if (!fileData) {
                const resolved = await readExcelFromIdWithUploadsFallback(excelFileId);
                if (resolved) {
                    fileData = resolved.fileData;
                    downloadName = resolved.fileName;
                }
            }

            if (!fileData) {
                return "File data not found.";
            }

            const buffer = fileData instanceof Blob ? await fileData.arrayBuffer() : fileData;
            const workbook = XLSX.read(buffer, { type: 'array' });

            const sheetTabs = workbook.SheetNames.map((name, idx) =>
                `<button class="excel-tab" onclick="showSheet('${name.replace(/'/g, "\\'")}')" id="tab-${idx}">${name}</button>`
            ).join('');

            const sheetsHtml = workbook.SheetNames.map((name, idx) => {
                const sheet = workbook.Sheets[name];
                let html = XLSX.utils.sheet_to_html(sheet);
                html = html.replace(/<h2>.*?<\/h2>/, '');
                return `<div class="excel-sheet" id="sheet-${idx}" style="display:${idx === 0 ? 'block' : 'none'}">${html}</div>`;
            }).join('');

            const viewerHtml = `<!DOCTYPE html>
                <html>
                <head>
                <title>Excel Viewer</title>
                <style>
                    body { font-family: sans-serif; padding: 16px; }
                    .excel-tabs { margin-bottom: 16px; }
                    .excel-tab {
                        background: #f0f0f0;
                        border: 1px solid #ccc;
                        border-bottom: none;
                        padding: 8px 16px;
                        margin-right: 2px;
                        cursor: pointer;
                        font-size: 14px;
                        outline: none;
                    }
                    .excel-tab.active {
                        background: #fff;
                        border-bottom: 2px solid #0078d4;
                        font-weight: bold;
                    }
                    .excel-sheet { width: 100%; }
                    table { border-collapse: collapse; width: 100%; }
                    td, th { border: 1px solid #ccc; padding: 4px 8px; font-size: 13px; }
                    th { background: #f0f0f0; }
                </style>
                <script>
                    function showSheet(name) {
                        var names = ${JSON.stringify(workbook.SheetNames)};
                        names.forEach(function(n, idx) {
                            document.getElementById('sheet-' + idx).style.display = (n === name) ? 'block' : 'none';
                            document.getElementById('tab-' + idx).classList.toggle('active', n === name);
                        });
                    }
                    // Set first tab active on load
                    window.onload = function() {
                        document.getElementById('tab-0').classList.add('active');
                    };
                </script>
                </head>
                <body>
                    <div class="excel-tabs">${sheetTabs}</div>
                    ${sheetsHtml}
                </body>
                </html>`;

            const blob = new Blob([viewerHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');

            setTimeout(() => URL.revokeObjectURL(url), 60000);
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

            if (file.objectType === ObjectTypes.SBOL.id) {
                const panel = panelsSelectors.selectById(store.getState(), file.id)
                const sbmlContent = panel?.sbml || BLANK_SBML

                const baseName = file.name.replace(/\.xml$/, '').replace(/_sbol$/, '')
                const sbmlFileName = baseName + '_sbml.xml'

                let sbmlFile = findFileByNameOrId(sbmlFileName)
                if (!sbmlFile) {
                    const dirHandle = store.getState().workingDirectory.directoryHandle
                    sbmlFile = await createFileInDirectory(dirHandle, sbmlFileName, ObjectTypes.SBML.id, store.dispatch)
                }

                await writeToFileHandle(sbmlFile, sbmlContent)
            }
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

            if (!lastUpload?.selectedRepo || !(lastUpload?.collectionUri || lastUpload?.uri)) {
                showErrorNotification("Cannot update", "No prior upload record with repository information found.");
                return "No prior upload record found.";
            }

            const selectedRepo = lastUpload.selectedRepo;
            const expectedEmail = lastUpload.userEmail || null;
            const collectionUrl = lastUpload.collectionUri || lastUpload.uri;
            const collectionName = lastUpload.collectionName;

            function getStoredToken() {
                try {
                    const stored = localStorage.getItem('SynbioHub');
                    if (!stored) return null;
                    const repos = JSON.parse(stored);
                    const entry = repos.find(r => r.registryURL === selectedRepo);
                    return entry?.authtoken || null;
                } catch { return null; }
            }

            async function resolveAuthToken() {
                const storedToken = getStoredToken();

                if (storedToken) {
                    try {
                        const loginResult = await CheckLogin(selectedRepo, storedToken);
                        const actualEmail = (loginResult.profile?.email || '').toLowerCase();
                        if (loginResult.valid) {
                            if (!expectedEmail || actualEmail === expectedEmail.toLowerCase()) {
                                return storedToken;
                            }

                            showErrorNotification(
                                "Authentication failed",
                                `Logged in user (${actualEmail || 'unknown'}) does not match expected user (${expectedEmail}).`
                            );
                            return null;
                        }
                    } catch {}
                }

                const modalResult = await new Promise((resolve) => {
                    store.dispatch(openUnifiedModal({
                        modalType: MODAL_TYPES.SBH_LOGIN,
                        allowedModals: [
                            MODAL_TYPES.SBH_LOGIN,
                            MODAL_TYPES.ADD_SBH_REPO,
                        ],
                        props: {
                            selectedRepo,
                        },
                        callback: (result) => resolve(result || null),
                    }));
                });

                if (!modalResult?.completed) {
                    showNotification({ title: "Update cancelled", message: "Login was cancelled." });
                    return null;
                }

                const refreshedToken = getStoredToken();
                if (!refreshedToken) {
                    showErrorNotification("Authentication failed", "No token found after login.");
                    return null;
                }

                try {
                    const loginResult = await CheckLogin(selectedRepo, refreshedToken);
                    if (!loginResult.valid) {
                        showErrorNotification("Authentication failed", "Token is invalid or expired after login.");
                        return null;
                    }

                    const actualEmail = (loginResult.profile?.email || '').toLowerCase();
                    if (expectedEmail && actualEmail !== expectedEmail.toLowerCase()) {
                        showErrorNotification(
                            "Authentication failed",
                            `Logged in user (${actualEmail || 'unknown'}) does not match expected user (${expectedEmail}).`
                        );
                        return null;
                    }

                    return refreshedToken;
                } catch (err) {
                    showErrorNotification("Authentication failed", err.message || "Unable to validate login token.");
                    return null;
                }
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
                            const uploadPath = sameFilename ? `${directory}/uploads/${stagingName}` : newFilePath;

                            const response = await upload_resource(
                                uploadPath,
                                selectedRepo,
                                authToken,
                                collectionUrl,
                                dirHandle,
                                3
                            );

                            if (sameFilename) {
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
                                collectionUri: collectionUrl,
                                uri: response.sbh_url,
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
                            try { await uploadsDir.removeEntry(stagingName); } catch {}
                            showErrorNotification("Failed to update file", err.message);
                            resolve("Failed to update file: " + err.message);
                        }
                    };

                    input.click();
                });
            }

            const authToken = await resolveAuthToken();
            if (!authToken) {
                return "Authentication token not available.";
            }

            return await performUpdate(authToken);
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