import CreateNewButton from "../activities/explorer/CreateNewButton.jsx"
import { Accordion, ScrollArea, Title } from '@mantine/core'
import { ObjectTypes } from "../../objectTypes.js"
import ImportFile from "../activities/explorer/ImportFile.jsx"
import { useEffect, useState } from 'react'
import DownloadMetadata from "../activities/explorer/DownloadMetadata.jsx"
import { fetchFilesAndFoldersFromOneDrive } from '../../microsoft-utils/oneDrive/fetchFromOneDrive.js'
import MicrosoftExplorerListItem from "./MicrosoftExplorerListItem.jsx"
import { createFileInOneDrive } from "../../microsoft-utils/oneDrive/createOneDriveFile.js"


export default function MicrosoftExplorerList({ objectTypesToList }) {
    const [oneDriveFolder] = useState(() => {
        const raw = localStorage.getItem('one-drive-folder');
        return raw ? JSON.parse(raw) : null;
    });
    const [files, setFoldersAndFiles] = useState([]);
    
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