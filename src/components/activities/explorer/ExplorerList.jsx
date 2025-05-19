import { useCreateFile, useFiles } from '../../../redux/hooks/workingDirectoryHooks'
import CreateNewButton from "./CreateNewButton"
import { Accordion, ScrollArea, Title} from '@mantine/core'
import { ObjectTypes } from '../../../objectTypes'
import ExplorerListItem from './ExplorerListItem'
import {writeToFileHandle } from '../../../redux/hooks/workingDirectoryHooks'
import ImportFile from './ImportFile'
import { useState} from 'react'
import Registries from './Registries.jsx'
import { useWorkingDirectory } from '../../../redux/hooks/workingDirectoryHooks'

export default function ExplorerList({workDir, objectTypesToList}) {

    // grab file handles
    const files = useFiles()
    let tempDirectory;

    const [importedFile, setImportedFile] = useState(null)

    // handle directory selection
    const [workingDirectory, setWorkingDirectory] = useWorkingDirectory()

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


            /*

                let directoryHandle = null

                ------

                some code blah blah <---- subDirectory is not null / empty

                ------
                return {
                    fileobj: file,
                    name: file.name,
                    fileHandle: fileHandle,
                    directoryHandle: directoryHandle1, <------
                    objectType: await classifyFile(fileHandle) 
                }
            */

            const arrayBuffer = await file.fileobj.arrayBuffer()
            const copied = new File([arrayBuffer], `copy_of_${file.name}`, { type: file.type })
            const targetDir = file.directoryHandle || workDir
            const draftHandle = await targetDir.getFileHandle(file.name, { create: true })
            const copiedText = await copied.text()

            await writeToFileHandle(draftHandle, copiedText)
            refreshWorkDir()

            return copied
        } catch (err) {
            console.error("Error copying file:", err)
            return null
        }
    }
    

    // handle creation
    const createFile = useCreateFile()
    const handleCreateObject = objectType => async fileName => {
        let tempDirectory;
        if(objectType.title === "Plasmids"){ // Retrieve Plasmids directory, if it doesn't exist create it first
            tempDirectory = await workDir.getDirectoryHandle("plasmids", { create: true });
        }
        if(objectType.title === "Metadata"){ // Retrieve XDC spreadsheet directory, if it doesn't exist create it first
            tempDirectory = await workDir.getDirectoryHandle("experimental setups", { create: true });
        }
        if(objectType.title === "Results"){ // Retrieve plate reader outputs directory, if it doesn't exist create it first
            tempDirectory = await workDir.getDirectoryHandle("experimental results", { create: true });
        }
        if(objectType.title === "Experiments"){ // Retrieve XDC directory, if it doesn't exist create it first
            tempDirectory = await workDir.getDirectoryHandle("XDC", { create: true });
        }
        if(objectType.title === "Assembly Plan"){ // Retrieve assembly plan directory, if it doesn't exist create it first
            tempDirectory = await workDir.getDirectoryHandle("assemblyPlans", { create: true });   
        }
        if(objectType.title === "Build"){ // Retrieve build directory, if it doesn't exist create it first
            tempDirectory = await workDir.getDirectoryHandle("builds", { create: true });   
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
        <ScrollArea style={{ height: 'calc(100vh - 120px)'}}>
            <Title mt={10} order={6} mb={10}>
                Current Folder: {workDir.name}            
            </Title>
            

            <Accordion
                mt={10}
                multiple
                defaultValue={[...Object.values(ObjectTypes).map(({ id }) => id)]}
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
                                        {objectType.importable &&
                                            <ImportFile
                                            onSelect={finalImport}
                                            text={`Import ${objectType.title}`}
                                            {...(objectType.subdirectory && {useSubdirectory: objectType.subdirectory})}>                                                                            
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
                                    {objectType.isRepository && 
                                        <Registries 
                                        defaultRegistry={objectType.defaultRegistry} 
                                        typeOfRegistry={objectType.listTitle}
                                        title={objectType.title}/>
                                    }
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
