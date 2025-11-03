import {Accordion} from '@mantine/core'
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
export default function Registries({typeOfRegistry, title, defaultRegistry = null}){
    const dispatch = useDispatch()

    // When initializing registries state
    const storageKey = typeOfRegistry == 'SynBioHub Repositories' ? 'SynbioHub' : 'Flapjack';
    const storedRegistries = JSON.parse(localStorage.getItem(storageKey)) || [];
    const cleanedRegistries = storedRegistries.map(reg => `https://${reg.instance}`);

    // Now set state
    const [registries, setRegistries] = useState(cleanedRegistries);
    
    const onCreate = (inputValue) => {
        const URLexpression = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i
        const URLRegex = new RegExp(URLexpression)

        let url = inputValue.trim();
        if (url.match(URLRegex)) {
            // If missing protocol, add https:// and strip www.
            if (!/^https?:\/\//i.test(url)) {
            url = url.replace(/^www\./i, '');
            url = `https://${url}`;
            }
            dispatch(actions.openPanel({
                id: url,
                type: "synbio.panel-type.synbiohub",
            }));
            setRegistries((prev) => {
                const updatedRegistries = [...prev, url]
                return updatedRegistries
            })

            // Update localStorage with the new inputValue
            const storageKey = typeOfRegistry == 'SynBioHub Repositories' ? 'SynbioHub' : 'Flapjack';
            const storedRegistries = JSON.parse(localStorage.getItem(storageKey)) || [];
            const selected = url.replace(/^(https?:\/\/)?(www\.)?/, '');
            const isDuplicate = storedRegistries.some(reg => reg.instance === selected);
            if (!isDuplicate) {
                const updatedInstance = {
                    ...(storageKey === 'SynbioHub' && { affiliation: "" }),
                    authtoken: "",
                    email: "",
                    instance: selected,
                    label: selected,
                    ...(storageKey === 'SynbioHub' && { name: "" }),
                    ...(storageKey === 'Flapjack' && { refresh: "" }),
                    username: "",
                    value: selected
                };
                storedRegistries.push(updatedInstance);
            }
            localStorage.setItem(storageKey, JSON.stringify(storedRegistries));
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
        
        // Remove the deleted registry from localStorage (SynbioHub/Flapjack)
        const storageKey = typeOfRegistry === 'SynBioHub Repositories' ? 'SynbioHub' : 'Flapjack';
        const storedRegistries = JSON.parse(localStorage.getItem(storageKey)) || [];
        const registryKey = registryToDelete.replace(/^https?:\/\//, '');
        console.log(registryKey)
        const updatedRegistries = storedRegistries.filter(reg => reg.instance !== registryKey && reg.instance !== registryToDelete);
        localStorage.setItem(storageKey, JSON.stringify(updatedRegistries));
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


