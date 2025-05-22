import { Group } from "@mantine/core";
import { AiOutlinePlus } from "react-icons/ai";
import { getPrimaryColor } from "../../../modules/colorScheme";
import { createContext, useState } from "react";
import { classifyFile } from "../../../objectTypes";
import { Text } from "@mantine/core";
import { useSelector } from "react-redux";

export const importedFile = createContext()

export default function ImportFile({ onSelect, text, useSubdirectory = false }) {
        const [selectedFile, setSelectedFile] = useState(null)
        const dirName = useSelector(state => state.workingDirectory.directoryHandle)



        async function addFileMetadata(fileHandle) {
            let directoryHandle = null
            const file = await fileHandle.getFile()
         
            if( useSubdirectory ) {   
                //const subdirectoryName = useSubdirectory 
                try {
                    //Checks to see if subdirectory exists already
                    directoryHandle = await dirName.getDirectoryHandle(useSubdirectory, { create: false });        
                } catch (e) {
                    //If subdirectory does not exist, create it
                    directoryHandle = await dirName.getDirectoryHandle(useSubdirectory, { create: true });
                }
            }

            return {
                fileobj: file,
                name: file.name,
                fileHandle: fileHandle,
                directoryHandle: directoryHandle,
                objectType: await classifyFile(fileHandle) 
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

