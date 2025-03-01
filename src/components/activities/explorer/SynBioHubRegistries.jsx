
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
export default function SynBioHubRegistries({}){
    const dispatch = useDispatch()
    const defaultRegistry = "https://synbiohub.org"

    // // Get default registry and additional ones from localStorage 
    const storedRegistries = JSON.parse(localStorage.getItem("SynBioHub Registries")) || [];
    const [synBioHubData, setSynBioHubData] = useState([defaultRegistry, ...storedRegistries])
    
    
    const onCreate = (inputValue) => {
        const URLexpression = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i
        const URLRegex = new RegExp(URLexpression)
    
        // Only URLs should be added
        if (inputValue.match(URLRegex)){
            dispatch(actions.openPanel({
                id: inputValue,
                type: "synbio.panel-type.synbiohub",
            }));
            setSynBioHubData((prev) => {
                const updatedRegistries = [...prev, inputValue]

                // Re add all registries to localStorage including the new one, exclude the default registry
                localStorage.setItem("SynBioHub Registries", JSON.stringify(updatedRegistries.filter((registry) => registry !== defaultRegistry)))
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

        const registries = synBioHubData.filter((registry) => {
            return registry !== registryToDelete
        })
        setSynBioHubData(registries)
        
        // Add all registries without the deleted registry back to localStorage, excluding the default Registry
        localStorage.setItem("SynBioHub Registries", JSON.stringify(registries.filter((registry) => registry !== defaultRegistry)))
    }
    
    return(
        <Accordion.Item value='SynBioHub'>
                <Accordion.Control>
                    <Title order={6} sx={titleStyle}>SynBioHub Registries</Title>
                </Accordion.Control>
                <Accordion.Panel>
                        <CreateNewButton onCreate={onCreate}>
                            New Registry
                        </CreateNewButton>
                        {
                            synBioHubData.map((registry) => {
                               return <ListRegistries 
                               key={registry} 
                               registry={registry} 
                               defaultRegistry={defaultRegistry} 
                               onConfirmDelete={onConfirmDelete}/>
                            })
                        }
                </Accordion.Panel>
            </Accordion.Item>
    )
}

const titleStyle = theme => ({
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase',
})

