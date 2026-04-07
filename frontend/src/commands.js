import store from "./redux/store"
import { isPanelOpen, panelsActions, serializePanel } from "./redux/hooks/panelsHooks"
import { workDirActions, writeToFileHandle } from "./redux/hooks/workingDirectoryHooks"
import { showErrorNotification } from "./modules/util"
import { showNotification } from "@mantine/notifications"
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

            const readFileFromId = async targetId => {
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

            const readExcelFromIdWithUploadsFallback = async targetId => {
                const direct = await readFileFromId(targetId);
                if (!direct) return null;

                const targetExt = (direct.fileName.split('.').pop() || '').toLowerCase();
                const baseName = direct.fileName.replace(/\.[^/.]+$/, "");
                const dirHandle = state.directoryHandle;

                if (dirHandle && typeof dirHandle.getFileHandle === 'function') {
                    try {
                        const parts = targetId.split('/');
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

                try {
                    const json = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
                    if (typeof json?.file === 'string' && isExcelExt(json.file)) {
                        referencedPath = json.file;
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
                    return "No Excel file reference found in JSON.";
                }

                let resolvedExcel = null;

                if (referencedPath) {
                    resolvedExcel = await readExcelFromIdWithUploadsFallback(referencedPath);
                }

                if (!resolvedExcel && excelFileName) {
                    const excelEntity = Object.values(state.entities).find(entity => entity.name === excelFileName);
                    if (excelEntity) {
                        resolvedExcel = await readExcelFromIdWithUploadsFallback(excelEntity.id);
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
                    showNotification({
                        title: "File update cancelled",
                        message: "The file update was cancelled.",
                    });
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