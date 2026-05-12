import { useCreateFile, useFiles, createFileInDirectory, writeToFileHandle } from '../../../redux/hooks/workingDirectoryHooks'
import { useDispatch } from 'react-redux'
import CreateNewButton from "./CreateNewButton"
import { Accordion, ScrollArea, Title} from '@mantine/core'
import { ObjectTypes, BLANK_SBML } from '../../../objectTypes'
import ExplorerListItem from './ExplorerListItem'
import ImportFile from './ImportFile'
import { useState} from 'react'
import Registries from './Registries.jsx'
import { useWorkingDirectory } from '../../../redux/hooks/workingDirectoryHooks'
import DownloadMetadata from './DownloadMetadata.jsx'
import OpenSeqImproveButton from './OpenSeqImproveButton.jsx'
import useUnifiedModal from '../../../redux/hooks/useUnifiedModal.js'
import { useOpenPanel } from '../../../redux/hooks/panelsHooks'

export default function ExplorerList({workDir, objectTypesToList}) {

    // grab file handles
    const files = useFiles()

    const { workflows } = useUnifiedModal()

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

    async function runImportCollectionWorkflow() {
        return new Promise((resolve) => {
            workflows.browseCollections(resolve, {
                multiSelect: false,
                rootOnly: true,
            })
        })
    }

    // handle creation
    const createFile = useCreateFile()
    const dispatch = useDispatch()
    const openPanel = useOpenPanel()

    async function createStudyWorkflowFile(fileName, modalResult) {
        const directory = await workDir.getDirectoryHandle(ObjectTypes.Studies.subdirectory, { create: true })
        const fileHandle = await createFileInDirectory(directory, fileName + ObjectTypes.Studies.extension, ObjectTypes.Studies.id, dispatch)

        const selectedCollection = modalResult.collections?.[0]

        const workflowData = {
            activeStep: 0,
            metadata: null,
            results: null,
            plateOutput: null,
            collection: {
                uri: selectedCollection?.uri || null,
                name: selectedCollection?.name || null,
                displayId: selectedCollection?.displayId || null,
                selectedRepo: modalResult.selectedRepo || null,
                authToken: modalResult.authToken || null,
                sbh_overwrite: modalResult.sbh_overwrite ?? 0,
                completed: true,
            },
            uploads: [],
        }

        await writeToFileHandle(fileHandle, JSON.stringify(workflowData))
        openPanel(fileHandle)
    }

    const handleCreateObject = objectType => async fileName => {
        let tempDirectory;
        let modalResult = null;
        if (objectType.id === ObjectTypes.Studies.id) {
            modalResult = await runImportCollectionWorkflow()
            if (!modalResult?.completed) {
                return
            }

            await createStudyWorkflowFile(fileName, modalResult)
            return
        }
        if(objectType.subdirectory){
            tempDirectory = await workDir.getDirectoryHandle(objectType.subdirectory, { create: true });
        }

        if (objectType.id === ObjectTypes.SBOL.id) {
            const directory = tempDirectory || workDir
            createFile(fileName + "_sbol.xml", objectType.id, directory)
            const sbmlHandle = await createFileInDirectory(directory, fileName + "_sbml.xml", ObjectTypes.SBML.id, dispatch)
            await writeToFileHandle(sbmlHandle, BLANK_SBML)
        } else {
            createFile(fileName + objectType.extension, objectType.id, tempDirectory)
        }
    }
    
    // generate DragObjects based on data
    const createListItems = (files, Icon, importable) => files.map((file, i) =>
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
                                        {objectType.importable && objectType.iframeImport &&
                                            <OpenSeqImproveButton
                                                text={`Import ${objectType.title}`}
                                                url={objectType.iframeUrl}>
                                            </OpenSeqImproveButton>
                                        }
                                        {objectType.importable && !objectType.iframeImport &&
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
