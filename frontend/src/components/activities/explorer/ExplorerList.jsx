import { useCreateFile, useFiles } from '../../../redux/hooks/workingDirectoryHooks'
import CreateNewButton from "./CreateNewButton"
import { Accordion, ScrollArea, Title} from '@mantine/core'
import { ObjectTypes } from '../../../objectTypes'
import ExplorerListItem from './ExplorerListItem'
import ImportFile from './ImportFile'
import { useState} from 'react'
import Registries from './Registries.jsx'
import { useWorkingDirectory } from '../../../redux/hooks/workingDirectoryHooks'
import DownloadMetadata from './DownloadMetadata.jsx'

export default function ExplorerList({workDir, objectTypesToList}) {

    // grab file handles
    const files = useFiles()

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
    const createFile = useCreateFile()
    const handleCreateObject = objectType => async fileName => {
        let tempDirectory;
        if(objectType.subdirectory){
            tempDirectory = await workDir.getDirectoryHandle(objectType.subdirectory, { create: true });
        }
        createFile(fileName + objectType.extension, objectType.id, tempDirectory)
    }
    
    // generate DragObjects based on data
    const createListItems = (files, Icon, importable) => files.map((file, i, importable) =>
        <ExplorerListItem 
            fileId={file.id}
            icon={Icon && <Icon />}
            key={i}
            importable={importable}
        />
    )

    return (
        <ScrollArea style={{ height: 'calc(100vh - 120px)'}}>
            <Title mt={10} order={6} mb={10} >
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
                                .sort((a, b) => a.name?.localeCompare(b.name))
                            return (    
                                <Accordion.Item value={objectType.id} key={i}>
                                    <Accordion.Control>
                                        <Title order={6} sx={titleStyle} >{objectType.listTitle}</Title>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        {objectType.downloadable &&
                                            <DownloadMetadata objectType={objectType}>
                                            </DownloadMetadata>
                                        }
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
                                        {createListItems(filesOfType, objectType.icon, objectType.importable)}
                                    {objectType.isRepository ?
                                        <Registries 
                                            typeOfRegistry={objectType.listTitle}
                                            title={objectType.title}
                                        /> : <></>
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
    fontSize: 11,
    textTransform: 'uppercase',
})
