import { useCreateFile, useFiles } from '../../../redux/hooks/workingDirectoryHooks'
import CreateNewButton from "./CreateNewButton"
import { Accordion, ScrollArea, Title, Text, Flex } from '@mantine/core'
import { ObjectTypes } from '../../../objectTypes'
import ExplorerListItem from './ExplorerListItem'
import { useWorkingDirectory } from '../../../redux/hooks/workingDirectoryHooks'
import ImportFile from './ImportFile'
import { useState, useCallback, useSelector } from 'react'
import { useDispatch } from 'react-redux'
import { current } from '@reduxjs/toolkit'


export default function ExplorerList({currentDirectory}) {

    // grab file handles
    const files = useFiles()

    const [importedFile, setImportedFile] = useState(null)
    console.log(importedFile)

    const finalImport = (file) => {
        setImportedFile(file)
        console.log("File type:", typeof file.fileHandle);
        copySelectedFile(file)
    }

    async function copySelectedFile(file) {
        if (!file) return null
        try {
            const arrayBuffer = await file.fileobj.arrayBuffer()
            console.log("File type:", typeof file);
            console.log("File properties:", file);

            const copied = new File([arrayBuffer], `copy_of_${file.name}`, { type: file.type })
            console.log("Copied File:", copied)
            return copied
        } catch (err) {
            console.error("Error copying file:", err)
            return null
        }
    }
    
    // handle creation
    const createFile = useCreateFile()
    const handleCreateObject = objectType => fileName => {
        createFile(fileName + objectType.extension, objectType.id)
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
                Current Folder: {currentDirectory}            
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
                        const filesOfType = files.filter(file => file.objectType == objectType.id)

                        return (    
                            <Accordion.Item value={objectType.id} key={i}>
                                <Accordion.Control>
                                    <Title order={6} sx={titleStyle} >{objectType.listTitle}</Title>
                                </Accordion.Control>
                                <Accordion.Panel>
                                    {objectType.importable &&
                                    <ImportFile
                                    onSelect={finalImport}
                                    text={`Import ${objectType.title}`} >
                                        
                                    </ImportFile>
                            }
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

