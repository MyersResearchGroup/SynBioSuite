import { Group } from "@mantine/core";
import { AiOutlinePlus } from "react-icons/ai";
import { getPrimaryColor } from "../../../modules/colorScheme";
import { Text } from "@mantine/core";
import { useState } from "react";
import DragObject from "../../DragObject";
import { titleFromFileName } from "../../../redux/hooks/workingDirectoryHooks";

export default function ImportFile({ onSelect, text }) {
        const [selectedFile, setSelectedFile] = useState(null);

        async function addFileMetadata(fileHandle) {
            const file = await fileHandle.getFile(); 
            return {
                id: file.id, 
                name: file.name,
                objectType: await classifyFile(fileHandle) 
            };
        }

        const handleClick = async () => {
            try {
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [
                        {
                            description: "OMEX or Edge HTML Files",
                            accept: {
                                "application/omex": [".omex"],
                                "text/html": [".html", ".htm"],
                                "application/xhtml+xml": [".xhtml"],
                                "application/xml": [".xml"],
                                "multipart/related": [".mhtml"]
                            }
                        }
                    ],
                    multiple: false,
                    startIn: 'desktop'
                });

                const fileMetadata = await addFileMetadata(fileHandle); 
                setSelectedFile(fileMetadata);

                onSelect?.(fileMetadata);
            } catch (err) {
                console.error("File selection canceled or failed", err);
            }
        };

        return (
            <Group sx={groupStyle} onClick={handleClick}>
                {selectedFile && (
                    <DragObject
                        title={titleFromFileName(selectedFile.name)}
                        fileId={selectedFile.id}
                        type={selectedFile.objectType}
                        icon={icon}
                        onDoubleClick={handleOpenFile}
                        onContextMenu={handleRightClick}
                    />
                )}
                <AiOutlinePlus />
                <Text size="sm" sx={textStyle}>
                    {selectedFile?.name || text}
                </Text>
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
