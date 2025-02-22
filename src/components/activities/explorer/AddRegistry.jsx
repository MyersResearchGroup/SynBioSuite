
import {ActionIcon, Tooltip, TextInput, Group, Popover, Menu, MultiSelect} from '@mantine/core'
import { Select } from '@mantine/core'
import {panelsSlice} from "../../../redux/store.js"
const { actions } = panelsSlice
import {useDispatch} from "react-redux";
import { useState } from 'react'
import { AiOutlinePlus } from "react-icons/ai"
import { AiOutlineMinus } from "react-icons/ai";
import { IoEllipsisVertical } from "react-icons/io5";


/**
 * Component to handle the selection, adding, and deleting of different SynBioHub Registries
 */
export default function AddRegistry({}){
    const dispatch = useDispatch()
    const [addingRegistry, setAddingRegistry] = useState(false)
    const [deletingRegistry, setDeletingRegistry] = useState(false)

    // Default Registry
    const [synBioHubData, setSynBioHubData] = useState([{label: 'SynBioHub', value: "https://synbiohub.org/"}])
    const [value, setValue] = useState('');
    const URLexpression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    const URLRegex = new RegExp(URLexpression)
    const [isError, setIsError] = useState(false)
    const [registry, setRegistry] = useState('')

    // handle key presses, namely Escape and Enter
    const keyDownHandler = event => {
        switch (event.code) {
            case "Escape": setAddingRegistry(false)
                break
            case "Enter":
                if (value.match(URLRegex)){
                    setSynBioHubData([...synBioHubData, value])
                    setAddingRegistry(false)
                    setDeletingRegistry(false)
                    setRegistry(value)
                    handleOnRegistrySelectChange(value)
                }
                else{
                    setIsError(true)
                }
                break
        }
    }

    const handleOnRegistrySelectChange = (value) => {
        setRegistry(value)
        dispatch(actions.openPanel({
            id: value,
            type: "synbio.panel-type.synbiohub",
        }));
    }
        
    const onAddRegistryClick = () => {
        setIsError(false)
        setAddingRegistry(true)
    }

    const onDeleteRegistryClick = () => {
        setDeletingRegistry(true)
    }

    const handleOnRegistryInput = (event) => {
        setValue(event.currentTarget.value)
    }

    const clickOutsideRef = () => setAddingRegistry(false)
    const groceries = ['🍎 Apples', '🍌 Bananas', '🥦 Broccoli', '🥕 Carrots', '🍫 Chocolate'];
    return(
        <>
            {addingRegistry ?
                <TextInput label="Add a Registry" 
                    placeholder='URL' 
                    onChange={handleOnRegistryInput} 
                    onKeyDownCapture={keyDownHandler} 
                    onBlur={clickOutsideRef}
                    error={isError ? "Invalid URL" : null}
                    autoFocus={true}/>
                :
                <Select
                    label="Select a SynBioHub Instance"
                    placeholder="Pick value"
                    data={synBioHubData}
                    value={registry}
                    onChange={handleOnRegistrySelectChange}
                    searchable
                    spellCheck="false"
                    comboboxProps={{ withinPortal: false }}
                    rightSection={
                        <Tooltip label="Add/Delete Registries" position='bottom' > 
                        <Menu position='bottom'>
                            <Menu.Target>
                                <ActionIcon >    
                                    <IoEllipsisVertical/>
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item onClick={onAddRegistryClick}>
                                    Add
                                </Menu.Item>
                                <Menu.Item onClick={onDeleteRegistryClick}>
                                    Delete
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                        </Tooltip>
                
                    }
                >
                </Select>
            }
            {deletingRegistry &&
            <p>sd</p>
            // <Combobox>
            //     <Combobox.Dropdown>
            //         <Combobox.Options>
            //             {groceries}
            //         </Combobox.Options>
            //     </Combobox.Dropdown>
            // </Combobox>

        }
        
        </>
    )
}