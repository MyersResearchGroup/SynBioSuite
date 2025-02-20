import { useCreateFile, useFiles } from '../../../redux/hooks/workingDirectoryHooks'
import CreateNewButton from "./CreateNewButton"
import { Accordion, ScrollArea, Title, Text, Flex, Button, ActionIcon, Tooltip, TextInput } from '@mantine/core'
import { ObjectTypes } from '../../../objectTypes'
import ExplorerListItem from './ExplorerListItem'
import { Select } from '@mantine/core'
import {panelsSlice} from "../../../redux/store.js"
const { actions } = panelsSlice
import {useDispatch} from "react-redux";
import { useState } from 'react'
import { AiOutlinePlus } from "react-icons/ai"
import { useClickOutside } from '@mantine/hooks'


export default function ExplorerList({workDir}) {
    const dispatch = useDispatch()
    const [synBioHubData, setSynBioHubData] = useState([{label: 'SynBioHub', value: "https://synbiohub.org/"}])
    const [creating, setCreating] = useState(false)
    const [value, setValue] = useState('');

    
    // handle key presses, namely Escape and Enter
    const keyDownHandler = event => {
        switch (event.code) {
            case "Escape": setCreating(false)
                break
            case "Enter":
                setSynBioHubData([...synBioHubData, value])
                setCreating(false)
                break
        }
    }

    //TODO: add the plus button to add more data, should append a json
    // grab file handles
    const files = useFiles()
    // handle creation
    const createFile = useCreateFile()
    const handleCreateObject = objectType => async fileName => {
        let tempDirectory;
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

    const handleOnSynBioChange = (value) => {
        dispatch(actions.openPanel({
            id: value,
            type: "synbio.panel-type.synbiohub",
        }));
    }
    
    const onAddRegistryClick = () =>{
        // setSynBioHubData([...synBioHubData, {label: "test", value: "clak"}])
        setCreating(true)
    }

    const clickOutsideRef = useClickOutside(() => setCreating(false))
    
    
    return (
        <ScrollArea style={{ height: 'calc(100vh - 120px)' }}>
            <Title mt={10} order={6} mb={10}>
                Current Folder: {workDir.name}            
            </Title>

            {creating ?
            <TextInput label="Add a Registry" placeholder='URL' onChange={(event) => setValue(event.currentTarget.value)} onKeyDownCapture={keyDownHandler} ref={clickOutsideRef} />
            :
            <Select
                label="Select a SynBioHub Instance"
                placeholder="Pick value"
                data={synBioHubData}
                onChange={handleOnSynBioChange}
                searchable
                spellCheck="false"
                rightSection={
                    <Tooltip label="Add New Registry" position='bottom'>
                        <ActionIcon onClick={onAddRegistryClick}>
                            <AiOutlinePlus/>    
                        </ActionIcon>
                    </Tooltip>
                }
            >
            </Select>
            
            }
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
