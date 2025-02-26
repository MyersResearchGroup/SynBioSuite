
import {ActionIcon, Tooltip, TextInput, Menu, MultiSelect, Button} from '@mantine/core'
import { Select } from '@mantine/core'
import {panelsSlice} from "../../../redux/store.js"
const { actions } = panelsSlice
import {useDispatch} from "react-redux";
import { useEffect, useState } from 'react'
import { IoEllipsisVertical } from "react-icons/io5";
import { IoMdCheckmark } from "react-icons/io";
import { HiOutlineXMark } from "react-icons/hi2";

/**
 * Component to handle the selection, adding, and deleting of different SynBioHub Registries
 */
export default function AddRegistry({}){
    const dispatch = useDispatch()

    // Handle different states
    const [isAddingRegistry, setIsAddingRegistry] = useState(false)
    const [isDeletingRegistry, setIsDeletingRegistry] = useState(false)

    // Get default registry and additional ones from localStorage
    const storedRegistries = JSON.parse(localStorage.getItem("registries")) || [];
    const [synBioHubData, setSynBioHubData] = useState(["https://synbiohub.org/", ...storedRegistries])

    // Input from adding a registry 
    const [inputValue, setInputValue] = useState('');
    const URLexpression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    const URLRegex = new RegExp(URLexpression)
    const [isError, setIsError] = useState(false)
    const [registry, setRegistry] = useState('')
    const [registriesToDelete, setRegistriesToDelete] = useState([])


    useEffect(() => {
    }, [synBioHubData])
    // handle key presses, namely Escape and Enter
    const keyDownHandler = event => {
        switch (event.code) {
            case "Escape": 
                setIsAddingRegistry(false)
                setIsDeletingRegistry(false)
                break
            case "Enter":
                confirmAddRegistry()
                break
            }
        }
        
        const confirmAddRegistry = () => {
            if (inputValue.match(URLRegex)){
                setSynBioHubData((prev) => {
                    const updatedRegistries = [...prev, inputValue]
                    localStorage.setItem("registries", JSON.stringify(updatedRegistries.slice(1)))
                    return updatedRegistries
                })
                setIsAddingRegistry(false)
                setIsDeletingRegistry(false)
                setRegistry(inputValue)
                handleOnRegistrySelectChange(inputValue)
        }
        else{
            setIsError(true)
        }
            
    }
    const handleOnRegistrySelectChange = (value) => {
        setRegistry(value)
        dispatch(actions.openPanel({
            id: value,
            type: "synbio.panel-type.synbiohub",
        }));
    }
        
    const onAddOptionClick = () => {
        setIsError(false)
        setIsAddingRegistry(true)
    }

    const onDeleteOptionClick = () => {
        setIsDeletingRegistry(true)
    }               

    const handleOnRegistryInput = (event) => {
        setInputValue(event.currentTarget.value)
    }

    const cancelAction = () => {
        setIsAddingRegistry(false)
        setIsDeletingRegistry(false)
    }

    const onAddToDelete = (value) => {
        setRegistriesToDelete(value)
    }

    const onConfirmDelete = () => {
        setIsDeletingRegistry(false)
        const registries = synBioHubData.filter((registry) => {
            return !registriesToDelete.includes(registry)
        })
        setSynBioHubData(registries)
        setRegistriesToDelete([])

        localStorage.setItem("registries", JSON.stringify(registries.slice(1)))
    }
    
    return(
        <>
            {isAddingRegistry ?
                <TextInput label="Add a Registry" 
                    placeholder='URL' 
                    onChange={handleOnRegistryInput} 
                    onKeyDownCapture={keyDownHandler} 
                    error={isError ? "Invalid URL" : null}
                    autoFocus={true}
                    rightSection={
                        inputValue ?   
                        <Tooltip label="Confirm" position='bottom' withinPortal withArrow>
                            <ActionIcon onClick={confirmAddRegistry}>
                                <IoMdCheckmark/>
                            </ActionIcon>
                        </Tooltip>
                        :
                        <Tooltip label="Cancel" position='bottom' withinPortal withArrow>
                            <ActionIcon onClick={cancelAction}>
                                <HiOutlineXMark />
                            </ActionIcon> 
                        </Tooltip>
                    }
                    />
            :
            isDeletingRegistry ?
                <MultiSelect
                    placeholder={'Pick Registries'}
                    label="Choose Registries to delete"
                    data={synBioHubData.slice(1)}
                    autoFocus={true}
                    onKeyDownCapture={keyDownHandler} 
                    onChange={onAddToDelete}
                    rightSection={
                        registriesToDelete.length ?
                        <Tooltip label="Confirm" position="bottom" withinPortal withArrow> 
                            <ActionIcon onClick={onConfirmDelete}>
                                <IoMdCheckmark/>
                            </ActionIcon>
                        </Tooltip>
                        :
                        <Tooltip label="Cancel" position='bottom' withinPortal withArrow>
                            <ActionIcon onClick={cancelAction}>
                                <HiOutlineXMark />
                            </ActionIcon> 
                        </Tooltip>
                    }
                >
                </MultiSelect>
            :
            <Select
                label="Select a SynBioHub Instance"
                placeholder="Pick value"
                data={synBioHubData}
                value={registry}
                onChange={handleOnRegistrySelectChange}
                searchable
                spellCheck="false"
                rightSection={
                    
                    <Menu position='bottom'>
                        <Menu.Target>
                            <Tooltip label="Add/Delete Registries" position='top' withinPortal withArrow>
                                <ActionIcon>    
                                    <IoEllipsisVertical/>
                                </ActionIcon>
                            </Tooltip>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item onClick={onAddOptionClick}>
                                Add
                            </Menu.Item>
                            <Menu.Item onClick={onDeleteOptionClick}>
                                Delete
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                
                }
            >
            </Select>

        }
        
        </>
    )
}