import store from "./redux/store"
import { isPanelOpen, panelsActions, panelsSelectors, serializePanel, resolveExperimentBackingFile } from "./redux/hooks/panelsHooks"
import { workDirActions, writeToFileHandle, readFileFromPath, createFileInDirectory } from "./redux/hooks/workingDirectoryHooks"
import { ObjectTypes, BLANK_SBML } from "./objectTypes"
import { showErrorNotification } from "./modules/util"
import { showNotification } from "@mantine/notifications"
import { openUnifiedModal } from "./redux/slices/modalSlice"
import { loadOverlay, closeOverlay } from "./redux/slices/loadingOverlay"
import { MODAL_TYPES } from "./modules/unified_modal/unifiedModal"
import { upload_resource, upload_sbol, CheckLogin } from "./API"
import { readStudy } from "./modules/util";
import { workingDirectorySlice } from './redux/store'

const EXCEL_VIEWER_PANEL_TYPE = 'synbio.panel-type.excel-viewer'

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
                return "File does not exist."

            const dirHandle =
                store.getState().workingDirectory.directoryHandle

            const parts = file.id.split('/')
            const fileName = parts.pop()

            let currentDir = dirHandle

            for (const part of parts) {
                currentDir = await currentDir.getDirectoryHandle(part)
            }
            await currentDir.removeEntry(fileName)

            if (fileName.toLowerCase().endsWith('.xml')) {
                const sidecarName = fileName.replace(/\.xml$/i, '.json')
                const sidecarId = [...parts, sidecarName].join('/')
                try {
                    await currentDir.removeEntry(sidecarName)
                } catch (e) {
                    if (e.name !== 'NotFoundError') {
                        console.warn(`Could not delete sidecar ${sidecarId}:`, e)
                    }
                }
                store.dispatch(workDirActions.removeFile(sidecarId))
            }
            if (/\.(xlsm|xlsx|xls)$/i.test(fileName)) {
                const sidecarExt =
                    file.objectType === ObjectTypes.Metadata.id
                        ? '.xdc'
                        : '.json'
                const sidecarName = fileName.replace(/\.(xlsm|xlsx|xls)$/i, sidecarExt)
                const sidecarId = [...parts, sidecarName].join('/')
                try {
                    await currentDir.removeEntry(sidecarName)
                } catch (e) {
                    if (e.name !== 'NotFoundError') {
                        console.warn(`Could not delete sidecar ${sidecarId}:`, e)
                    }
                }
                store.dispatch(workDirActions.removeFile(sidecarId))
            }
            store.dispatch(panelsActions.closePanel(file.id))
            store.dispatch(workDirActions.removeFile(file.id))
        }
    },

    FileRename: {
        id: createId('file-rename'),
        title: "Rename File",
        shortTitle: "Rename",
        description: "Rename a file",
        color: "blue",
        arguments: [
            {
                name: "fileNameOrId",
                prompt: "Enter the file name or ID"
            },
            {
                name: "newName",
                prompt: "Enter the new file name"
            }
        ],
        execute: async (fileNameOrId, newName) => {
            const file = findFileByNameOrId(fileNameOrId)
            if (!file)
                return "File does not exist."
            if (!newName)
                return "New file name is required."
            const rootHandle =
                store.getState().workingDirectory.directoryHandle
            const parts = file.id.split('/')
            const oldName = parts.pop()
            if (oldName === newName)
                return
            const oldExt = oldName.includes('.')
                ? oldName.slice(oldName.lastIndexOf('.'))
                : ''
            const newExt = newName.includes('.')
                ? newName.slice(newName.lastIndexOf('.'))
                : ''
            if (oldExt.toLowerCase() !== newExt.toLowerCase())
                return "File extension cannot be changed."

            // Find the directory containing the file
            let currentDir = rootHandle
            for (const part of parts) {
                currentDir = await currentDir.getDirectoryHandle(part)
            }

            // Make sure the new name doesn't already exist
            try {
                await currentDir.getFileHandle(newName)
                return `File "${newName}" already exists.`
            } catch (e) {
                if (e.name !== 'NotFoundError')
                    throw e
            }

            const oldId = file.id
            const newId = [...parts, newName].join('/')

            //
            // Rename main file
            //

            const newHandle = await renameFile(currentDir, oldName, newName)

            let oldSidecarName = null
            let newSidecarName = null
            let oldSbmlName = null
            let newSbmlName = null

            if (/_sbol\.xml$/i.test(oldName)) {
                oldSidecarName = oldName.replace(/_sbol\.xml$/i, '_sbol.json')
                newSidecarName = newName.replace(/_sbol\.xml$/i, '_sbol.json')
                oldSbmlName = oldName.replace(/_sbol\.xml$/i, '_sbml.xml')
                newSbmlName = newName.replace(/_sbol\.xml$/i, '_sbml.xml')
            } else if (/\.xml$/i.test(oldName)) {
                oldSidecarName = oldName.replace(/\.xml$/i, '.json')
                newSidecarName = newName.replace(/\.xml$/i, '.json')
            } else if (/\.xlsm$/i.test(oldName)) {
                const extension =
                    file.objectType === ObjectTypes.Metadata.id
                        ? '.xdc'
                        : '.json'

                oldSidecarName = oldName.replace(/\.xlsm$/i, extension)
                newSidecarName = newName.replace(/\.xlsm$/i, extension)
            }

            if (oldSidecarName) {
                try {
                    await renameFile(currentDir,oldSidecarName,newSidecarName)
                } catch (e) {
                    if (e.name !== 'NotFoundError')
                        throw e
                }
            }

            if (oldSbmlName) {
                try {
                    const oldSbmlId = [...parts, oldSbmlName].join('/')
                    const newSbmlId = [...parts, newSbmlName].join('/')
                    const oldSbml = store.getState().workingDirectory.entities[oldSbmlId]
                    const newSbmlHandle = await renameFile(currentDir,oldSbmlName,newSbmlName)
                    store.dispatch(workDirActions.removeFile(oldSbmlId))
                    newSbmlHandle.id = newSbmlId
                    newSbmlHandle.objectType = oldSbml?.objectType
                    store.dispatch(workDirActions.addFile(newSbmlHandle))
                } catch (e) {
                    if (e.name !== 'NotFoundError')
                        throw e
                }
            }

            await updateFileReferences(rootHandle,oldId,newId)

            store.dispatch(workDirActions.removeFile(oldId))
            newHandle.id = newId
            newHandle.objectType = file.objectType
            store.dispatch(workDirActions.addFile(newHandle))
            store.dispatch(workingDirectorySlice.actions.uploadChanged())

            const state = store.getState()

            const oldPanel =
                panelsSelectors.selectById(state, oldId) ||
                panelsSelectors.selectById(state, `${oldId}::view`)

            if (oldPanel) {
                store.dispatch(panelsActions.updateOne({
                    id: oldPanel.id,
                    changes: {
                        name: oldPanel.name.endsWith(' (view)')
                            ? `${newName} (view)`
                            : newName,

                        fileHandle: {
                            ...oldPanel.fileHandle,
                            id: oldPanel.fileHandle?.id?.replace(oldId, newId),
                            name: newName
                        }
                    }
                }))
            }
            return `Renamed "${oldName}" to "${newName}".`
        }
    },
    
    FileOpen: {
        id: createId('file-open'),
        title: "Open File",
        shortTitle: "Open",
        description: "Open file",
        arguments: [
            {
                name: "fileNameOrId",
                prompt: "Enter the file name or ID"
            }
        ],

        execute: async fileNameOrId => {
            const file = findFileByNameOrId(fileNameOrId);
            if (!file) return "File does not exist.";

            if (!/\.(xls|xlsx|xlsm)$/i.test(file.name)) {
                return "Only Excel files can be viewed.";
            }

            const state = store.getState().workingDirectory;
            let fileData = state.entities[file.id]?.data;

            if (!fileData) {
                try {
                    const parts = file.id.split('/');
                    let dir = state.directoryHandle;

                    for (const part of parts.slice(0, -1)) {
                        dir = await dir.getDirectoryHandle(part);
                    }

                    const handle = await dir.getFileHandle(parts.at(-1));
                    fileData = await handle.getFile();
                } catch {
                    return "Could not read Excel file.";
                }
            }

            const buffer = fileData instanceof Blob
                ? await fileData.arrayBuffer()
                : fileData;

            const panelId = `${file.id}::view`;

            const panelState = {
                id: panelId,
                type: EXCEL_VIEWER_PANEL_TYPE,
                name: `${file.name} (view)`,
                file: buffer,
                fileHandle: {
                    id: panelId,
                    name: file.name,
                    objectType: file.objectType,
                }
            };

            if (isPanelOpen(panelId)) {
                store.dispatch(panelsActions.updateOne({
                    id: panelId,
                    changes: panelState
                }));
                store.dispatch(panelsActions.setActive(panelId));
            } else {
                store.dispatch(panelsActions.openPanel(panelState));
            }
        }
    },

    FileView: {
        id: createId('file-view'),
        title: "View File",
        shortTitle: "View",
        description: "View on SynBioHub",
        arguments: [
            {
                name: "fileNameOrId",
                prompt: "Enter the file name or ID"
            }
        ],

        execute: async (fileNameOrId,uploadInfo) => {
            const file = findFileByNameOrId(fileNameOrId);
            if (!file) return "File does not exist.";

            const uri = uploadInfo?.uri;
            if (!uri) return "No SynBioHub URI found.";

            window.open(uri, '_blank', 'noopener,noreferrer');
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
            const panel = panelsSelectors.selectById(store.getState(), fileNameOrId)
            if (panel?.type === EXCEL_VIEWER_PANEL_TYPE) {
                return
            }

            const file = findFileByNameOrId(fileNameOrId)
            if (!file)
                return "File does not exist."

            if(!isPanelOpen(file.id))
                return "Panel is not open."

            const targetFile = (/\.(xlsm|xlsx|xls)$/i.test(file.name || ""))
                ? await resolveExperimentBackingFile(file)
                : file

            await writeToFileHandle(targetFile, serializePanel(file.id))
            store.dispatch(workingDirectorySlice.actions.uploadChanged())

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
            if (!file) return "File does not exist.";

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

                            let currentDir = null;
                            try { currentDir = await cur.getDirectoryHandle('uploads'); } catch (e) {}

                            if (currentDir) {
                                const baseName = file.name.replace(/\.[^/.]+$/, "");
                                for await (const entry of currentDir.values()) {
                                    if (entry.kind === 'file' && entry.name.replace(/\.[^/.]+$/, "") === baseName) {
                                        const fh = await currentDir.getFileHandle(entry.name);
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
    FileUpload: {
        id: createId('file-upload'),
        title: "Upload File",
        shortTitle: "Upload",
        description: "Upload file to SynBioHub collection",
        arguments: [
            {
                name: "fileNameOrId",
                prompt: "Enter the file name or ID"
            }
        ],
        execute: async fileNameOrId => {
            const file = findFileByNameOrId(fileNameOrId);
            if (!file) return "File does not exist.";
            const sbmlFile = findFileByNameOrId(fileNameOrId.replace('_sbol.xml','_sbml.xml'));

            const dirHandle = store.getState().workingDirectory.directoryHandle;
            const directory = file.id.split("/")[0];

            let jsonData = null;

            try {
              jsonData = await readStudy(dirHandle);
            } catch (e) {
              showErrorNotification("Failed to read study file", e.message);
              return "Failed to read study file.";
            }
            const selectedRepo = jsonData.registryURL;
            const expectedEmail = jsonData.userEmail || null;
            const collectionUrl = jsonData.collectionUri;
            const collectionId = jsonData.collectionId;
            const collectionName = jsonData.name;
            const registryAPI = jsonData.registryAPI;
            const registryPrefix = jsonData.registryPrefix;
            const importType = directory.endsWith(".xml")?"designs":directory;

            async function performUpload(authToken) {
              try {
                store.dispatch(loadOverlay());
                let response;
                try {
                    if (importType=='resources'||importType=='strains'||importType=='sampleDesigns') {
                        response = await upload_resource(
                            file,
                            registryAPI,
                            registryPrefix,
                            authToken,
                            collectionUrl,
                            importType,
                            true,
                            importType
                        )
                    } else {
                        response = await upload_sbol(
                            file,
                            sbmlFile,
                            registryAPI,
                            registryPrefix,
                            authToken,
                            collectionUrl,
                            true,
                            importType
                        );
                    }
                } finally {
                  store.dispatch(closeOverlay());
                }

                const collectionEntry = {
                    name: collectionName,
                    displayId: collectionId,
                    uri: collectionUrl,
                    selectedRepo,
                    userEmail: expectedEmail
                }

                const uploadEntry = {
                    collectionName,
                    collectionUri: collectionUrl,
                    uri: response.subCollectionUrl,
                    file: file.id,
                    date: new Date().toLocaleString(undefined, { timeZoneName: 'short' }),
                    selectedRepo,
                    userEmail: expectedEmail,
                    type: 'upload',
                };

                const updatedJson = {
                    file: file.id,
                    collection: collectionEntry,
                    uploads: [uploadEntry]
                };

                let jsonPath;
                if (importType=='resources'||importType=='strains'||importType=='sampleDesigns') {
                    if (file.id.endsWith('.xlsm')) {
                        jsonPath = file.id.replace(/\.xlsm$/i, '.json');
                    } else if (file.id.endsWith('.xlsx')) {
                        jsonPath = file.id.replace(/\.xlsx$/i, '.json');
                    } else {
                        showErrorNotification("Failed to upload file", file.id + " is incorrect file type.");
                        return "Failed to upload file: " + file.id + " is incorrect file type.";
                    }
                } else if (importType=='devices'||importType=='designs'||importType=='plasmids') {
                    if (file.id.endsWith('xml')) {
                        jsonPath = file.id.replace(/\.xml$/i, '.json');
                    } else {
                       showErrorNotification("Failed to upload file", file.id + " is incorrect file type.");
                        return "Failed to upload file: " + file.id + " is incorrect file type.";
                    }
                } else {
                    showErrorNotification("Failed to upload file", importType + " cannot be uploaded.");
                    return "Failed to upload file: " + file.id + " is incorrect file type.";
                }
                const parts = jsonPath.split('/');
                const fileName = parts.pop();
                let currentDir = dirHandle;
                for (const part of parts) {
                    currentDir = await currentDir.getDirectoryHandle(part);
                }
                const jsonFH = await currentDir.getFileHandle(fileName, { create: true });
                await writeToFileHandle(jsonFH, JSON.stringify(updatedJson));

                store.dispatch(workingDirectorySlice.actions.uploadChanged())

                showNotification({
                    title: "File uploaded",
                    message: `${file.name} uploaded successfully to ${collectionName} study.`,
                    color: "green",
                });

                return "File updated successfully.";
                
              } catch (err) {
                showErrorNotification("Failed to upload file", err.message);
                return "Failed to upload file: " + err.message;
              }
            }
            const authToken = await resolveAuthToken(selectedRepo,registryAPI,expectedEmail);
            if (!authToken) {
                return "Authentication token not available.";
            }

            return await performUpload(authToken);
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
            if (!file) return "File does not exist.";

            const dirHandle = store.getState().workingDirectory.directoryHandle;
            const directory = file.id.split("/")[0];

            let jsonData = null;
            let selectedRepo = null;
            let expectedEmail = null;
            let collectionUrl = null;
            let collectionName = null;
            let registryAPI = null;
            let registryPrefix = null;
            let currentDir = null;

            try {
                let jsonPath;
                if (file.name.endsWith('.xlsm')) {
                    jsonPath = file.id.replace(/\.xlsm$/i, '.json');
                } else if (file.id.endsWith('.xlsx')) {
                    jsonPath = file.id.replace(/\.xlsx$/i, '.json');
                } else {
                    showErrorNotification("Failed to upload file", file.id + " is incorrect file type.");
                    return "Failed to update file: " + file.id + " is incorrect file type.";
                }
                const parts = jsonPath.split('/');
                const jsonFileName = parts.pop();
                currentDir = dirHandle;
                for (const part of parts) {
                    currentDir = await currentDir.getDirectoryHandle(part);
                }
                const jsonFH = await currentDir.getFileHandle(jsonFileName);
                const jsonText = await (await jsonFH.getFile()).text();
                jsonData = JSON.parse(jsonText);
    
                const lastUpload = jsonData.uploads?.length
                    ? jsonData.uploads[jsonData.uploads.length - 1]
                    : null;

                if (!lastUpload?.selectedRepo || !(lastUpload?.collectionUri || lastUpload?.uri)) {
                    showErrorNotification("Cannot update", "No prior upload record with repository information found.");
                    return "No prior upload record found.";
                }

                selectedRepo = lastUpload.selectedRepo;
                expectedEmail = lastUpload.userEmail || null;
                collectionUrl = lastUpload.collectionUri || lastUpload.uri;
                collectionName = lastUpload.collectionName;
                registryAPI = (() => {
                    try {
                        const stored = localStorage.getItem('SynbioHub');
                        if (!stored) return selectedRepo;
                        const repos = JSON.parse(stored);
                        return repos.find(r => r.registryURL === selectedRepo)?.registryAPI || selectedRepo;
                    } catch {
                        return selectedRepo;
                    }
                })();
                registryPrefix = (() => {
                    try {
                        const stored = localStorage.getItem('SynbioHub');
                        if (!stored) return selectedRepo;
                        const repos = JSON.parse(stored);
                        return repos.find(r => r.registryURL === selectedRepo)?.registryPrefix || selectedRepo;
                    } catch {
                        return selectedRepo;
                    }
                })();

                const authToken = await resolveAuthToken(selectedRepo,registryAPI,expectedEmail);
                if (!authToken) {
                    return "Authentication token not available.";
                }

                return await performUpdate(authToken);
            } catch (e) {
                if (e?.name != "NotFoundError") { 
                    showErrorNotification("Error reading workflow file", e.message);
                    return "Failed to read workflow file.";
                }
                return await performUpdate(null);
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
                        const existingFileName = file.name;

                        if (existingFileName) {
                            const originalExt = getExtension(existingFileName);
                            const newFileExt = getExtension(newFile.name);
                            if (originalExt !== newFileExt) {
                                showErrorNotification("File type mismatch", `Expected ${originalExt} but got ${newFileExt}`);
                                return resolve(`File type mismatch. Expected ${originalExt} but got ${newFileExt}`);
                            }
                        }

                        try {
                            const newFileName = newFile.name;
                            const extension = getExtension(newFileName);
                            const oldJsonFileName = existingFileName.replace(extension,'.json');
                            const newJsonFileName = newFileName.replace(extension,'.json');
                            const sameFilename = existingFileName && existingFileName === newFileName;
                            const stagingName = sameFilename ? `__tmp__${newFileName}` : newFileName;
                            const stagingFH = await currentDir.getFileHandle(stagingName, { create: true });
                            const writable = await stagingFH.createWritable();
                            await writable.write(newFile);
                            await writable.close();

                            const newFilePath = `${directory}/${newFileName}`;
                            const uploadPath = sameFilename ? `${directory}/${stagingName}` : newFilePath;
                            
                            let response;
                            if (authToken!=null) {
                                store.dispatch(loadOverlay());
                                try {
                                    response = await upload_resource(
                                        uploadPath,
                                        registryAPI,
                                        registryPrefix,
                                        authToken,
                                        collectionUrl,
                                        dirHandle,
                                        true,
                                        `${directory}`
                                    );
                                } finally {
                                    store.dispatch(closeOverlay());
                                }
                            }
                            if (sameFilename) {
                                const finalFH = await currentDir.getFileHandle(newFileName, { create: true });
                                const finalWritable = await finalFH.createWritable();
                                await finalWritable.write(newFile);
                                await finalWritable.close();
                                try { await currentDir.removeEntry(stagingName); } catch {}
                            } else if (existingFileName) {
                                try { await currentDir.removeEntry(existingFileName); } catch {}
                            }
                            if (authToken!=null) {
                                const updateEntry = {
                                    collectionName,
                                    collectionUri: collectionUrl,
                                    uri: response.subCollectionUrl,
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
                                const jsonFH = await currentDir.getFileHandle(newJsonFileName, { create: true });
                                await writeToFileHandle(jsonFH, JSON.stringify(updatedJson));
                                if (!sameFilename) {
                                    try { await currentDir.removeEntry(oldJsonFileName); } catch {}
                                }
                            }

                            if (!sameFilename) {
                                const oldFileId = file.id

                                const newFileHandle = await currentDir.getFileHandle(
                                    newFileName,
                                    { create: false }
                                )

                                newFileHandle.id = `${directory}/${newFileName}`
                                newFileHandle.objectType = file.objectType

                                store.dispatch(workDirActions.removeFile(oldFileId))
                                store.dispatch(workDirActions.addFile(newFileHandle))
                            }

                            if (isPanelOpen(file.id)) {
                                store.dispatch(panelsActions.updateOne({
                                    id: file.id,
                                    changes: {
                                        file: newFilePath,
                                        uploads: updatedJson.uploads,
                                    }
                                }))
                            }
                            if (authToken!=null) {
                                showNotification({
                                    title: "File updated",
                                    message: `${newFileName} uploaded successfully to ${collectionName}.`,
                                    color: "green",
                                });
                            } else {
                                 showNotification({
                                    title: "File updated",
                                    message: `${newFileName} updated successfully.`,
                                    color: "green",
                                });                               
                            }

                            resolve("File updated successfully.");
                        } catch (err) {
                            try { await currentDir.removeEntry(stagingName); } catch {}
                            showErrorNotification("Failed to update file", err.message);
                            resolve("Failed to update file: " + err.message);
                        }
                    };

                    input.click();
                });
            }
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

function getStoredToken(selectedRepo) {
  try {
    const stored = localStorage.getItem('SynbioHub');
    if (!stored) return null;
    const repos = JSON.parse(stored);
    const entry = repos.find(r => r.registryURL === selectedRepo);
    return entry?.authtoken || null;
  } catch { return null; }
}

async function resolveAuthToken(selectedRepo,registryAPI,expectedEmail) {
  const storedToken = getStoredToken(selectedRepo);
  
  if (storedToken) {
    try {
      const loginResult = await CheckLogin(registryAPI || selectedRepo, storedToken);
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
  
  const refreshedToken = getStoredToken(selectedRepo);
  if (!refreshedToken) {
    showErrorNotification("Authentication failed", "No token found after login.");
    return null;
  }
  
  try {
    const loginResult = await CheckLogin(registryAPI || selectedRepo, refreshedToken);
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

const renameFile = async (dirHandle, oldName, newName) => {
    const oldHandle = await dirHandle.getFileHandle(oldName)
    const file = await oldHandle.getFile()

    const newHandle = await dirHandle.getFileHandle(newName, { create: true })
    const writable = await newHandle.createWritable()

    await writable.write(file)
    await writable.close()

    await dirHandle.removeEntry(oldName)

    return newHandle
}

const updateFileReferences = async (rootHandle, oldId, newId) => {
    const oldName = oldId.split('/').pop()
    const newName = newId.split('/').pop()

    const replaceReference = value => {
        if (typeof value !== 'string')
            return value

        if (value === oldId)
            return newId

        if (value === oldName)
            return newName

        if (value.endsWith('/' + oldName))
            return value.slice(0, -oldName.length) + newName

        return value
    }

    const updateDirectory = async dirHandle => {
        for await (const entry of dirHandle.values()) {

            if (entry.kind === 'directory') {
                await updateDirectory(entry)
                continue
            }

            if (!/\.(json|xdc)$/i.test(entry.name))
                continue

            try {
                const file = await entry.getFile()
                const text = await file.text()
                const json = JSON.parse(text)

                let changed = false

                // JSON/XDC file reference
                if (json.file !== undefined) {
                    const updated = replaceReference(json.file)
                    if (updated !== json.file) {
                        json.file = updated
                        changed = true
                    }
                }

                // XDC metadata reference
                if (json.metadata !== undefined) {
                    const updated = replaceReference(json.metadata)
                    if (updated !== json.metadata) {
                        json.metadata = updated
                        changed = true
                    }
                }

                // XDC plate-reader reference
                if (json.plateOutput !== undefined) {
                    const updated = replaceReference(json.plateOutput)
                    if (updated !== json.plateOutput) {
                        json.plateOutput = updated
                        changed = true
                    }
                }

                // XDC results reference(s)
                if (Array.isArray(json.results)) {
                    const updated = json.results.map(replaceReference)

                    if (updated.some((value, i) =>
                        value !== json.results[i])) {
                        json.results = updated
                        changed = true
                    }
                } else if (json.results !== undefined) {
                    const updated = replaceReference(json.results)

                    if (updated !== json.results) {
                        json.results = updated
                        changed = true
                    }
                }

                // Upload history references
                if (Array.isArray(json.uploads)) {
                    const replaceUploadReferences = value => {
                        if (typeof value === 'string')
                            return replaceReference(value)
                        if (Array.isArray(value))
                            return value.map(replaceUploadReferences)
                        if (value && typeof value === 'object') {
                            return Object.fromEntries(
                                Object.entries(value).map(([key, val]) => [
                                    key,
                                    replaceUploadReferences(val)
                                ])
                            )
                        }
                        return value
                    }
                    const updated = json.uploads.map(replaceUploadReferences)
                    if (JSON.stringify(updated) !== JSON.stringify(json.uploads)) {
                        json.uploads = updated
                        changed = true
                    }
                }

                if (changed) {
                    const writable = await entry.createWritable()
                    await writable.write(JSON.stringify(json, null, 2))
                    await writable.close()
                }

            } catch (e) {
                console.warn(
                    `Could not update references in ${entry.name}:`,
                    e
                )
            }
        }
    }

    await updateDirectory(rootHandle)
}


