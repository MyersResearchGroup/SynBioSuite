
import {Accordion, Title, Text, Group, Menu} from '@mantine/core'
import {panelsSlice} from "../../../redux/store.js"
const { actions } = panelsSlice
import {useDispatch} from "react-redux";
import { useState } from 'react'
import CreateNewButton from './CreateNewButton.jsx';

import ListRegistries from './ListRegistries.jsx';
import { showNotification } from '@mantine/notifications';

/**
 * Component to handle the creation, deletion, and containment of SynBioHub registries.
 */
export default function Registries({defaultRegistry, typeOfRegistry, title}){
    const dispatch = useDispatch()

    // Get default registry and additional ones from localStorage 
    const storedRegistries = JSON.parse(localStorage.getItem(typeOfRegistry)) || [];
    const [registries, setRegistries] = useState([defaultRegistry, ...storedRegistries])
    
    
    const onCreate = (inputValue) => {
        const URLexpression = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i
        const URLRegex = new RegExp(URLexpression)
    
        // Only URLs should be added
        if (inputValue.match(URLRegex)){
            dispatch(actions.openPanel({
                id: inputValue,
                type: "synbio.panel-type.synbiohub",
            }));
            setRegistries((prev) => {
                const updatedRegistries = [...prev, inputValue]

                // Re add all registries to localStorage including the new one, exclude the default registry
                localStorage.setItem(typeOfRegistry, JSON.stringify(updatedRegistries.filter((registry) => registry !== defaultRegistry)))
                return updatedRegistries
            })
        }
        else{
            showNotification({
                message: "Enter a valid URL",
                color: "red"
            })
        }
    }
       
    const onConfirmDelete = (registryToDelete) => {
        dispatch(actions.closePanel(registryToDelete))

        const filteredRegistries = registries.filter((registry) => {
            return registry !== registryToDelete
        })
        setRegistries(filteredRegistries)
        
        // Add all registries without the deleted registry back to localStorage, excluding the default Registry
        localStorage.setItem(typeOfRegistry, JSON.stringify(filteredRegistries.filter((registry) => registry !== defaultRegistry)))
    }
    
    return(
        <Accordion.Panel>
                <CreateNewButton onCreate={onCreate}>
                    New {title}
                </CreateNewButton>
                {
                    registries.map((registry) => {
                        return <ListRegistries 
                        key={registry} 
                        registry={registry} 
                        defaultRegistry={defaultRegistry} 
                        onConfirmDelete={onConfirmDelete}/>
                    })
                }
        </Accordion.Panel>
    )
}


