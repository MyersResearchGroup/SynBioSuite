import { useCreateFile, useFiles } from '../../../redux/hooks/workingDirectoryHooks'
import CreateNewButton from "./CreateNewButton"
import { Accordion, ScrollArea, Title, Text, Flex } from '@mantine/core'
import { ObjectTypes } from '../../../objectTypes'
import ExplorerListItem from './ExplorerListItem'
import SaveIndicatorDisplay from '../../saveIndicatorDisplay'


export default function ExplorerList({workDir, objectTypesToList}) {

    // grab file handles
    const files = useFiles()
    let tempDirectory;

    // handle creation
    const createFile = useCreateFile()
    const handleCreateObject = objectType => async fileName => {
        if(objectType.title === "Plasmid"){ // Retrieve Plasmid directory, if it doesn't exist create it first
            tempDirectory = await workDir.getDirectoryHandle("plasmid", { create: true });
             
        }
        createFile(fileName + objectType.extension, objectType.id, tempDirectory)
    }

    // generate DragObjects based on data
    const createListItems = (files, Icon) => files.map((file, i) =>
        <ExplorerListItem 
            fileId={file.id}
            icon={Icon && <Icon />}
            key={i}
        />
    )

    return (
        <ScrollArea style={{ height: 'calc(100vh - 120px)' }}>
            <Title mt={10} order={6}>
                Current Folder: {workDir.name}            
            </Title>

            <Accordion
                mt={10}
                multiple
                defaultValue={Object.values(ObjectTypes).map(({ id }) => id)}
                styles={accordionStyles}
                key={Math.random()}     // this forces re-render and fixes accordion heights
            >
                {
                    // create AccordionItems by object type
                    Object.values(ObjectTypes).map((objectType, i) => {
                        // grab files of current type
                        if(objectTypesToList.includes(objectType.id)){
                            const filesOfType = files.filter(file => file.objectType == objectType.id)
                            return (    
                                <Accordion.Item value={objectType.id} key={i}>
                                    <Accordion.Control>
                                        <Title order={6} sx={titleStyle} >{objectType.listTitle}</Title>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        {objectType.createable &&
                                            <CreateNewButton
                                                onCreate={handleCreateObject(objectType)}
                                                suggestedName={`New ${objectType.title}`}
                                            >
                                                New {objectType.title}
                                            </CreateNewButton>
                                        }
                                        {createListItems(filesOfType, objectType.icon)}
                                    </Accordion.Panel>
                                </Accordion.Item>
                            )
                        }

                    })
                }
            </Accordion>
        </ScrollArea>
    )
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
    fontSize: 12,
    textTransform: 'uppercase',
})
