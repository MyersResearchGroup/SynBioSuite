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
import { useUnifiedModal } from "../../../redux/hooks/useUnifiedModal";
import { upload_resource } from "../../../API";

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
        const { workflows } = useUnifiedModal()

        async function addFileMetadata(fileHandle) {
            const file = await fileHandle.getFile();
            return {
                fileobj: file,
                name: file.name,
                fileHandle: fileHandle,
                directoryHandle: null,
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
                } else if (objectType === 'experimentalSetups') {
                    jsonFileHandle.objectType = ObjectTypes.Metadata.id;
                }

                dispatch(actions.addFile(jsonFileHandle));
                openPanel(jsonFileHandle);
            } catch (err) {
                console.error("Error creating resource workflow JSON:", err);
            }
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

                if (WORKFLOW_SUBDIRS.includes(useSubdirectory)) {
                    workflows.browseCollections(async (result) => {
                        if (!result?.completed || !result?.collections?.length) return;

                        const collection = result.collections[0];
                        const baseName = fileMetadata.name.replace(/\.[^/.]+$/, "");
                        const ext = fileMetadata.name.match(/\.[^/.]+$/)?.[0] ?? '';

                        try {
                            const objectTypeDir = await dirName.getDirectoryHandle(useSubdirectory, { create: true });
                            const uploadsDir = await objectTypeDir.getDirectoryHandle('uploads', { create: true });
                            const availableBaseName = await getAvailableBaseName(objectTypeDir, uploadsDir, baseName, ext);
                            const actualFileName = `${availableBaseName}${ext}`;
                            const filePath = `${useSubdirectory}/uploads/${actualFileName}`;

                            await saveFileToUploads(fileMetadata.fileobj, useSubdirectory, actualFileName);

                            const uploadEntry = {
                                collectionName: collection.name || collection.displayId,
                                uri: collection.uri,
                                file: filePath,
                                date: new Date().toLocaleString(undefined, { timeZoneName: 'short' }),
                                selectedRepo: result.sbh_credential_check?.selectedRepo,
                                userEmail: result.sbh_credential_check?.userInfo?.email
                            };

                            await createWorkflowJSON(availableBaseName, useSubdirectory, filePath, uploadEntry);

                            await upload_resource(
                                filePath,
                                result.sbh_credential_check?.selectedRepo,
                                result.authToken,
                                collection.displayId,
                                collection.description,
                                dirName,
                                result.sbh_overwrite
                            );
                        } catch (err) {
                            console.error("Error saving file or creating workflow:", err);
                            showErrorNotification("Import Failed", err.message);
                        }
                    }, { multiSelect: false, rootOnly: true });
                } else {
                    onSelect?.(fileMetadata)
                }
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

