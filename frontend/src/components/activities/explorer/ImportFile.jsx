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

export const importedFile = createContext()

export default function ImportFile({ onSelect, text, useSubdirectory = false }) {
        const [selectedFile, setSelectedFile] = useState(null)
        const dirName = useSelector(state => state.workingDirectory.directoryHandle)
        const dispatch = useDispatch()
        const openPanel = useOpenPanel()
        const { actions } = workingDirectorySlice



        async function addFileMetadata(fileHandle) {
            let directoryHandle = null;
            const file = await fileHandle.getFile();

            if (useSubdirectory) {
                directoryHandle = await dirName.getDirectoryHandle(useSubdirectory, { create: false })
                    .catch(() => dirName.getDirectoryHandle(useSubdirectory, { create: true }));

                // TODO: Automatically generate this
                if (useSubdirectory === 'resources' || useSubdirectory === 'strains' || useSubdirectory === 'sampleDesigns' || useSubdirectory === "experimentalSetups") {
                    directoryHandle = await directoryHandle.getDirectoryHandle("uploads", { create: false })
                        .catch(() => directoryHandle.getDirectoryHandle("uploads", { create: true }));
                }
            }

            return {
                fileobj: file,
                name: file.name,
                fileHandle: fileHandle,
                directoryHandle: directoryHandle,
                objectType: await classifyFile(fileHandle)
            };
        }

        async function createWorkflowJSON(fileName, objectType) {
            try {
                const directory = await dirName.getDirectoryHandle(objectType, { create: true });
                const baseFileName = fileName.replace(/\.[^/.]+$/, "");
                const jsonFileName = `${baseFileName}.json`;

                let fileExists = false;
                for await (const entry of directory.values()) {
                    if (entry.kind === 'file' && entry.name === jsonFileName) {
                        fileExists = true;
                        break;
                    }
                }

                if (!fileExists) {
                    try {
                        const uploadsDir = await directory.getDirectoryHandle("uploads", { create: false });
                        for await (const entry of uploadsDir.values()) {
                            if (entry.kind === 'file' && entry.name.replace(/\.[^/.]+$/, "") == baseFileName) {
                                fileExists = true;
                                break;
                            }
                        }
                    } catch (e) {
                    }
                }

                if (fileExists) {
                    showErrorNotification('Same Filename', "SynbioSuite currently does not support uploading multiple files of same name.");
                    return;
                }

                const jsonFileHandle = await directory.getFileHandle(jsonFileName, { create: true });
                
                const defaultWorkflow = {
                    activeStep: 0,
                    file: `${objectType}/uploads/${fileName}`,
                    collection: {},
                    uploads: []
                };
                
                await writeToFileHandle(jsonFileHandle, JSON.stringify(defaultWorkflow));
                
                jsonFileHandle.id = `${objectType}/${jsonFileName}`;

                // TODO: Assign programatically
                if (useSubdirectory === 'resources') {
                    jsonFileHandle.objectType = ObjectTypes.Resources.id;
                } else if (useSubdirectory === 'strains') {
                    jsonFileHandle.objectType = ObjectTypes.Strains.id;
                } else if (useSubdirectory === 'sampleDesigns') {
                    jsonFileHandle.objectType = ObjectTypes.SampleDesigns.id;
                } else if (useSubdirectory === 'experimentalSetups') {
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
                
                // TODO: Automatically generate this list
                if (useSubdirectory === 'resources' || useSubdirectory === 'strains' || useSubdirectory === 'sampleDesigns' || useSubdirectory === "experimentalSetups") {
                    await createWorkflowJSON(fileMetadata.name, useSubdirectory);
                }

                onSelect?.(fileMetadata)
            } catch (err) {
                console.error("File selection canceled or failed", err)
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

