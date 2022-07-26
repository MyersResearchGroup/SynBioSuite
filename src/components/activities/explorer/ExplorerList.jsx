import DragObject from '../../DragObject'
import { useOpenPanel } from "../../../redux/slices/panelSlice"
import { titleFromFileName, useCreateFile, useWorkingDirectory } from '../../../redux/slices/workingDirectorySlice'
import CreateNewButton from "./CreateNewButton"
import { Accordion, Title } from '@mantine/core'
import { ObjectTypes } from '../../../objectTypes'


export default function ExplorerList() {

    // grab file handles
    const [, , files] = useWorkingDirectory()

    // handle opening of file
    const openPanel = useOpenPanel()
    const handleOpenFile = fileHandle => () => {
        openPanel({
            fileHandle
        })
    }

    // handle creation
    const createFile = useCreateFile()
    const handleCreateObject = (extension, suggestedName) => () => {
        createFile({ extension, suggestedName })
    }

    // generate DragObjects based on data
    const createDragObjects = (items, type, Icon) => items.map((item, i) =>
        <DragObject
            title={titleFromFileName(item.name)}
            fileId={item.id}
            type={type}
            icon={Icon && <Icon />}
            key={i}
            onDoubleClick={handleOpenFile(item)}
        />
    )

    return (
        <Accordion
            multiple
            initialState={
                Object.fromEntries(
                    Object.keys(ObjectTypes).map((_, i) => [i, true])
                )
            }
            styles={accordionStyles}
            key={Math.random()}     // this forces re-render and fixes accordion heights
        >
            {
                // create AccordionItems by object type
                Object.values(ObjectTypes).map((objectType, i) => {
                    // grab files of current type
                    const filesOfType = files.filter(file => file.objectType == objectType.id)

                    return (
                        <Accordion.Item key={i} label={
                            <Title order={6} sx={titleStyle} >{objectType.listTitle}</Title>
                        }>
                            {objectType.createable &&
                                <CreateNewButton
                                    onClick={handleCreateObject(objectType.extension, `New ${objectType.title}`)}
                                >
                                    New {objectType.title}
                                </CreateNewButton>}
                            {createDragObjects(filesOfType, objectType.id, objectType.icon)}
                        </Accordion.Item>
                    )
                })
            }
        </Accordion>
    )
}

const accordionStyles = theme => ({
    control: {
        padding: '4px 0',
        borderRadius: 4
    },
    contentInner: {
        fontSize: 12,
        padding: '5px 0'
    }
})

const titleStyle = theme => ({
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase'
})
