import { useCreateFile } from "../../redux/hooks/workingDirectoryHooks.js"
import CreateNewButton from "../activities/explorer/CreateNewButton.jsx"
import { Accordion, ScrollArea, Title } from '@mantine/core'
import { ObjectTypes } from "../../objectTypes.js"
import ExplorerListItem from "../activities/explorer/ExplorerListItem.jsx"
import ImportFile from "../activities/explorer/ImportFile.jsx"
import { useEffect, useState } from 'react'
import Registries from "../activities/explorer/Registries.jsx"
import DownloadMetadata from "../activities/explorer/DownloadMetadata.jsx"
import { fetchFilesAndFoldersFromOneDrive } from '../../microsoft-utils/oneDrive/fetchFromOneDrive.js'
import { useLocalStorage } from "@mantine/hooks"
import MicrosoftExplorerListItem from "./MicrosoftExplorerListItem.jsx"
import { createFileInOneDrive } from "../../microsoft-utils/oneDrive/createOneDriveFile.js"


export default function MicrosoftExplorerList({ objectTypesToList }) {
    const [oneDriveFolder] = useState(() => {
        const raw = localStorage.getItem('one-drive-folder');
        return raw ? JSON.parse(raw) : null;
    });
    const [files, setFoldersAndFiles] = useState([]);
    function mapOneDriveItemToObjectType(item) {
        if (item.isFolder) return "folder";

        const mime = item.file?.mimeType;
        const fileName = item.name.toLowerCase();
        const subdirectory = item.parentReference?.path; // Assuming parentReference gives folder path

        // Example subdirectories (you can adjust this list as needed)
        const plasmidSubdir = "plasmids"; // e.g., "plasmids" folder in OneDrive

        // Check for XML extension and check for the subdirectory path
        if (fileName.match(/\.xml$/) && subdirectory && subdirectory.includes(plasmidSubdir)) {
            return "synbio.object-type.plasmid";  // Match for plasmid XML files in the 'plasmids' subdirectory
        }

        // You can add more subdirectory checks for other object types here
        if (fileName.match(/\.json$/) && subdirectory && subdirectory.includes("jsons")) {
            return "synbio.object-type.json";
        }

        // MIME-based detection (for other file types)
        switch (mime) {
            case "application/json":
                return "synbio.object-type.json";
            case "text/xml":
                return "synbio.object-type.sbol";
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                return "synbio.object-type.analysis";
            case "application/octet-streamt":
                return "synbio.object-type.excel";
            case "text/plain":
                return "synbio.object-type.text";
            default:
                return "unknown";
        }
    }
    // grab file handles
    useEffect(() => {
        if (!oneDriveFolder?.id) return;
        fetchAndOpenPicker();
    }, [oneDriveFolder]);

    const flattenFilesAndFolders = (items) => {
        let flatItems = [];

        items.forEach(item => {
            if (item.files) {
                // If it's a folder, add the files inside it
                flatItems.push(...flattenFilesAndFolders(item.files)); // Recursive call for subfolder files
            } else {
                // If it's a file, add it directly
                flatItems.push(item);
            }
        });

        return flatItems;
    };

    // Fetch and open picker
    const fetchAndOpenPicker = async () => {
        // Fetch files and folders recursively and apply the mapping for each item
        const fetchedItems = await fetchFilesAndFoldersFromOneDrive(oneDriveFolder.id);
        setFoldersAndFiles(fetchedItems);
    };

    let tempDirectory;

    const [importedFile, setImportedFile] = useState(null)

    // handle directory selection
    const [workingDirectory, setWorkingDirectory] = useState()

    // handle refreshing working directory
    const refreshWorkDir = () => {
        setWorkingDirectory(workDir, false)
    }

    const finalImport = (file) => {
        setImportedFile(file)
        copySelectedFile(file)
    }

    async function copySelectedFile(file) {
        if (!file) return null
        try {
            const arrayBuffer = await file.fileobj.arrayBuffer()
            const copied = new File([arrayBuffer], `copy_of_${file.name}`, { type: file.type })
            const targetDir = file.directoryHandle || workDir
            const draftHandle = await targetDir.getFileHandle(file.name, { create: true })
            const writable = await draftHandle.createWritable()
            await writable.write(arrayBuffer)
            await writable.close()
            refreshWorkDir()
            return copied
        } catch (err) {
            console.error("Error copying file:", err)
            return null
        }
    }

    // handle creation
    const handleCreateObject = async (fileName, objectType) => {
        await createFileInOneDrive(oneDriveFolder.id, fileName, objectType)
    }

    // generate DragObjects based on data
    const createListItems = (files, Icon) => files.map((file, i) =>
        <MicrosoftExplorerListItem
            file={file}
            icon={Icon && <Icon />}
            key={i}
        />
    )

    const filterFilesByObjectType = (objectTypeId) => {
        return files.filter(file => file.objectType === objectTypeId);
    };

    return (
        <ScrollArea style={{ height: 'calc(100vh - 120px)' }}>
            <Title mt={10} order={6} mb={10}>
                Current Folder: {oneDriveFolder.name}
            </Title>
            <Accordion
                mt={10}
                multiple
                defaultValue={[...Object.values(ObjectTypes).map(({ id }) => id)]}
                styles={accordionStyles}
                key={Math.random()} // Forces re-render to fix accordion heights
            >
                {
                    // Iterate over each object type in the ObjectTypes object
                    Object.values(ObjectTypes).map((objectType, i) => {
                        // Only render sections for object types that should be listed
                        if (objectTypesToList.includes(objectType.id)) {
                            const filesOfType = filterFilesByObjectType(objectType.id)
                                .sort((a, b) => a?.name?.localeCompare(b?.name));

                            return (
                                <Accordion.Item value={objectType.id} key={i}>
                                    <Accordion.Control>
                                        <Title order={6} sx={titleStyle}>{objectType.listTitle}</Title>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        {objectType.downloadable &&
                                            <DownloadMetadata
                                                objectType={objectType}
                                            >
                                            </DownloadMetadata>
                                        }
                                        {objectType.importable &&
                                            <ImportFile
                                                onSelect={finalImport}
                                                text={`Import ${objectType.title}`}
                                                {...(objectType.subdirectory && { useSubdirectory: objectType.subdirectory })}>
                                            </ImportFile>
                                        }
                                        {objectType.createable &&
                                            <CreateNewButton
                                                onCreate={(fileName) => handleCreateObject(fileName, objectType)}
                                                suggestedName={`New ${objectType.title}`}
                                            >
                                                New {objectType.title}
                                            </CreateNewButton>
                                        }
                                        {createListItems(filesOfType, objectType.icon)}
                                    </Accordion.Panel>
                                </Accordion.Item>
                            );
                        }
                    })
                }
            </Accordion>
        </ScrollArea>
    );
}

const accordionStyles = theme => ({
    control: {
        padding: '4px 0',
        borderRadius: 4
    },
    content: {
        fontSize: 12,
        padding: '5px 0 10px 5px'
    }
})

const titleStyle = theme => ({
    fontWeight: 600,
    fontSize: 11,
    textTransform: 'uppercase',
})