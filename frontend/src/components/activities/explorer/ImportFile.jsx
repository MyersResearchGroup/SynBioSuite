import { Group } from "@mantine/core";
import { AiOutlinePlus } from "react-icons/ai";
import { getPrimaryColor } from "../../../modules/colorScheme";
import { createContext, useState } from "react";
import { classifyFile, ObjectTypes } from "../../../objectTypes";
import { Text } from "@mantine/core";
import { useSelector, useDispatch } from "react-redux";
import { writeToFileHandle } from "../../../redux/hooks/workingDirectoryHooks";
import { useOpenPanel } from "../../../redux/hooks/panelsHooks";
import { workingDirectorySlice } from "../../../redux/store";
import { showErrorNotification } from "../../../modules/util";
import { upload_resource } from "../../../API";
import { openUnifiedModal } from "../../../redux/slices/modalSlice";
import { MODAL_TYPES } from "../../../modules/unified_modal/unifiedModal";

export const importedFile = createContext()

const WORKFLOW_SUBDIRS = ['resources', 'strains', 'sampleDesigns', 'experimentalSetups']

async function getAvailableBaseName(objectTypeDir, uploadsDir, baseName, ext, maxAttempts = 1000) {
    let candidate = baseName;
    let counter = 1;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
        let jsonExists = false;
        let fileExists = false;
        try { await objectTypeDir.getFileHandle(`${candidate}.json`); jsonExists = true; } catch {}
        try { await uploadsDir.getFileHandle(`${candidate}${ext}`); fileExists = true; } catch {}
        if (!jsonExists && !fileExists) return candidate;
        candidate = `${baseName} (${counter})`;
        counter++;
    }
    throw new Error(`Unable to find available base name after ${maxAttempts} attempts.`);
}

export default function ImportFile({ onSelect, text, useSubdirectory = false }) {
    const [selectedFile, setSelectedFile] = useState(null)
    const dirName = useSelector(state => state.workingDirectory.directoryHandle)
    const dispatch = useDispatch()
    const openPanel = useOpenPanel()
    const { actions } = workingDirectorySlice

    const isWorkflowImport = WORKFLOW_SUBDIRS.includes(useSubdirectory)

    async function addFileMetadata(fileHandle) {
        const file = await fileHandle.getFile();
        let directoryHandle = null;

        if (useSubdirectory) {
            directoryHandle = await dirName.getDirectoryHandle(useSubdirectory, { create: false })
                .catch(() => dirName.getDirectoryHandle(useSubdirectory, { create: true }));

            // TODO: Automatically generate this
            if (useSubdirectory === 'resources' || useSubdirectory === 'strains' || useSubdirectory === 'sampleDesigns') {
                directoryHandle = await directoryHandle.getDirectoryHandle("uploads", { create: false })
                    .catch(() => directoryHandle.getDirectoryHandle("uploads", { create: true }));
            }
        }

        return {
            fileobj: file,
            name: file.name,
            fileHandle: fileHandle,
            directoryHandle,
            objectType: await classifyFile(fileHandle)
        };
    }

    async function saveFileToUploads(fileObj, objectType, actualFileName) {
        const subDir = await dirName.getDirectoryHandle(objectType, { create: true });
        const uploadsDir = await subDir.getDirectoryHandle('uploads', { create: true });
        const fileHandle = await uploadsDir.getFileHandle(actualFileName, { create: true });
        const writable = await fileHandle.createWritable();
        const arrayBuffer = await fileObj.arrayBuffer();
        await writable.write(arrayBuffer);
        await writable.close();
    }

    async function createWorkflowJSON(availableBaseName, objectType, filePath, initialUpload) {
        try {
            const directory = await dirName.getDirectoryHandle(objectType, { create: true });
            const jsonFileName = `${availableBaseName}.json`;
            const jsonFileHandle = await directory.getFileHandle(jsonFileName, { create: true });

            const defaultWorkflow = {
                activeStep: 0,
                file: filePath,
                collection: {},
                uploads: initialUpload ? [initialUpload] : []
            };

            await writeToFileHandle(jsonFileHandle, JSON.stringify(defaultWorkflow));

            jsonFileHandle.id = `${objectType}/${jsonFileName}`;

            if (objectType === 'resources') {
                jsonFileHandle.objectType = ObjectTypes.Resources.id;
            } else if (objectType === 'strains') {
                jsonFileHandle.objectType = ObjectTypes.Strains.id;
            } else if (objectType === 'sampleDesigns') {
                jsonFileHandle.objectType = ObjectTypes.SampleDesigns.id;
            }

            dispatch(actions.addFile(jsonFileHandle));
            openPanel(jsonFileHandle);
        } catch (err) {
            console.error("Error creating resource workflow JSON:", err);
        }
    }

    async function runImportCollectionWorkflow() {
        return new Promise((resolve) => {
            dispatch(openUnifiedModal({
                modalType: MODAL_TYPES.REPOSITORY_SELECTOR,
                allowedModals: [
                    MODAL_TYPES.REPOSITORY_SELECTOR,
                    MODAL_TYPES.SBH_CREDENTIAL_CHECK,
                    MODAL_TYPES.COLLECTION_BROWSER,
                    MODAL_TYPES.ADD_SBH_REPO,
                    MODAL_TYPES.SBH_LOGIN,
                    MODAL_TYPES.CREATE_COLLECTION,
                ],
                props: {
                    multiSelect: false,
                    rootOnly: true,
                },
                callback: (result) => {
                    resolve(result || null)
                },
            }))
        })
    }

    const handleClick = async () => {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [],
                multiple: false,
                startIn: 'desktop'
            })

            const fileMetadata = await addFileMetadata(fileHandle)
            setSelectedFile(fileMetadata)
            
            if (isWorkflowImport) {
                const lastDot = fileMetadata.name.lastIndexOf('.')
                const ext = lastDot >= 0 ? fileMetadata.name.slice(lastDot) : ''
                const baseName = lastDot >= 0 ? fileMetadata.name.slice(0, lastDot) : fileMetadata.name

                const objectTypeDir = await dirName.getDirectoryHandle(useSubdirectory, { create: true })
                const uploadsDir = await objectTypeDir.getDirectoryHandle('uploads', { create: true })
                const availableBaseName = await getAvailableBaseName(objectTypeDir, uploadsDir, baseName, ext)
                const actualFileName = `${availableBaseName}${ext}`
                const uploadedFilePath = `${useSubdirectory}/uploads/${actualFileName}`

                const modalResult = await runImportCollectionWorkflow()
                if (!modalResult?.completed) {
                    return
                }

                const selectedCollection = modalResult.collections?.[0]
                const selectedRepo = modalResult.selectedRepo
                const authToken = modalResult.authToken

                if (!selectedCollection?.uri || !selectedRepo || !authToken) {
                    showErrorNotification("Import aborted", "Missing repository, credentials, or collection selection.")
                    return
                }

                const collectionDisplayId = selectedCollection.uri.split('/').slice(-2, -1)[0]
                    || selectedCollection.displayId
                    || selectedCollection.name

                await saveFileToUploads(fileMetadata.fileobj, useSubdirectory, actualFileName)

                const uploadResponse = await upload_resource(
                    uploadedFilePath,
                    selectedRepo,
                    authToken,
                    collectionDisplayId,
                    "",
                    dirName,
                    modalResult.sbh_overwrite ?? 0
                )

                const initialUpload = {
                    collectionName: selectedCollection.name || selectedCollection.displayId || collectionDisplayId,
                    uri: uploadResponse?.sbh_url || selectedCollection.uri,
                    file: uploadedFilePath,
                    date: new Date().toLocaleString(undefined, { timeZoneName: 'short' }),
                    selectedRepo,
                    userEmail: modalResult.userInfo?.email || null,
                    type: 'initial',
                }

                await createWorkflowJSON(availableBaseName, useSubdirectory, uploadedFilePath, initialUpload)
                return
            }

            onSelect?.(fileMetadata)
        } catch (err) {
            console.warn("File selection canceled or failed", err)
        }
    }
        

    return (
        <Group sx={groupStyle} onClick={handleClick}>
            <importedFile.Provider value = {{selectedFile, setSelectedFile}}>
            <AiOutlinePlus />
            <Text size="sm" sx={textStyle} >
                    {text}
                </Text> 
            </importedFile.Provider>
        </Group>
    );
}

const groupStyle = (theme) => ({
    padding: "3px 0 3px 8px",
    borderRadius: 3,
    cursor: "pointer",
    color: getPrimaryColor(theme, 5),
    "&:hover": {
        backgroundColor: theme.colors.dark[5]
    }
});

const textStyle = (theme) => ({
    flexGrow: 1,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    userSelect: "none",
    color: getPrimaryColor(theme, 5),
    fontWeight: 500
});