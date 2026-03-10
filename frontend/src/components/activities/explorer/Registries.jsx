import {Accordion, Group, Text} from '@mantine/core'
import {panelsSlice} from "../../../redux/store.js"
const { actions } = panelsSlice
import {useDispatch} from "react-redux";
import { useState } from 'react'
import ListRegistries from './ListRegistries.jsx';
import AddRegistryModal from './AddRegistryModal.jsx';
import { AiOutlinePlus } from 'react-icons/ai';
import { getPrimaryColor } from '../../../modules/colorScheme';

/**
 * Component to handle the creation, deletion, and containment of SynBioHub registries.
 */
export default function Registries({typeOfRegistry, title, defaultRegistry = null}){
    const dispatch = useDispatch()

    // When initializing registries state
    const storageKey = typeOfRegistry == 'SynBioHub Repositories' ? 'SynbioHub' : 'Flapjack';
    const storedRegistries = JSON.parse(localStorage.getItem(storageKey)) || [];
    const cleanedRegistries = storedRegistries.map(reg => reg.registryURL);

    // Now set state
    const [registries, setRegistries] = useState(cleanedRegistries);
    const [modalOpen, setModalOpen] = useState(false);

    const onCreate = ({ registryURL, registryAPI, registryPrefix }) => {
        dispatch(actions.openPanel({
            id: registryURL,
            type: "synbio.panel-type.synbiohub",
        }));
        setRegistries((prev) => [...prev, registryURL]);

        // Update localStorage with the new registry entry
        const storageKey = typeOfRegistry == 'SynBioHub Repositories' ? 'SynbioHub' : 'Flapjack';
        const storedRegistries = JSON.parse(localStorage.getItem(storageKey)) || [];
        const isDuplicate = storedRegistries.some(reg => reg.registryURL === registryURL);
        if (!isDuplicate) {
            const updatedInstance = {
                ...(storageKey === 'SynbioHub' && { affiliation: "" }),
                authtoken: "",
                email: "",
                registryURL,
                registryAPI,
                registryPrefix,
                ...(storageKey === 'SynbioHub' && { name: "" }),
                ...(storageKey === 'Flapjack' && { refresh: "" }),
                username: "",
            };
            storedRegistries.push(updatedInstance);
        }
        localStorage.setItem(storageKey, JSON.stringify(storedRegistries));
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
        const updatedRegistries = storedRegistries.filter(reg => reg.registryURL !== registryToDelete);
        localStorage.setItem(storageKey, JSON.stringify(updatedRegistries));
    }
    
    return(
        <Accordion.Panel>
                <AddRegistryModal
                    opened={modalOpen}
                    onClose={() => setModalOpen(false)}
                    onAdd={onCreate}
                    title={title}
                    existingRegistries={registries}
                />
                <Group
                    sx={groupStyle}
                    onClick={() => setModalOpen(true)}
                >
                    <AiOutlinePlus />
                    <Text size='sm' sx={textStyle}>New {title}</Text>
                </Group>
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

const groupStyle = theme => ({
    padding: '3px 0 3px 8px',
    borderRadius: 3,
    cursor: 'pointer',
    color: getPrimaryColor(theme, 5),
    '&:hover': {
        backgroundColor: theme.colors.dark[5]
    }
})

const textStyle = theme => ({
    flexGrow: 1,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    color: getPrimaryColor(theme, 5),
    fontWeight: 500,
})

