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
                directoryHandle: useSubdirectory ? await dirName.getDirectoryHandle(useSubdirectory, { create: true }) : null,
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

        const handleClick = async () => {
            try {
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [],
                    multiple: false,
                    startIn: 'desktop'
                })

                const fileMetadata = await addFileMetadata(fileHandle)
                setSelectedFile(fileMetadata)
                
                // TODO: Automatically generate this list
                if (useSubdirectory === 'resources' || useSubdirectory === 'strains' || useSubdirectory === 'sampleDesigns') {
                    await createWorkflowJSON(fileMetadata.name, useSubdirectory);
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

