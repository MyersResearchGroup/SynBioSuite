
import {Text, Group, Menu} from '@mantine/core'
import {useDispatch} from "react-redux";
import { useState } from 'react'
import commands from '../../../commands.js';
import {panelsSlice} from "../../../redux/store.js"
const { actions } = panelsSlice
import { RiGitRepositoryLine } from "react-icons/ri";


/**
 * Helper Component for AddRegistry.jsx. Responsible for rendering individual items, opening a new panel, 
 * and adding a delete functionality to each item.
 */
export default function ListRegistries({registry, defaultRegistry, onConfirmDelete}){
    const dispatch = useDispatch()
    const [contextMenuOpen, setContextMenuOpen] = useState(false)

    const [registryToDelete, setRegistryToDelete] = useState('')
    
    // Open up the panel
    const onDoubleClick = () => {
        dispatch(actions.openPanel({
            id: registry,
            type: "synbio.panel-type.synbiohub",
        }));
    }
    
    // right click handler, opens up delete option
    const handleRightClick = (event) => {
        event.preventDefault()
        setRegistryToDelete(registry)
        setContextMenuOpen(true)
    }
    
    // command list
    const contextMenuCommands = [
        commands.FileDelete
    ]

    return(
        <Menu
            shadow="md"
            width={200}
            trigger=""
            opened={contextMenuOpen}
            onChange={setContextMenuOpen}
            withArrow={true}
            styles={menuStyles}
        >
            <Menu.Target>
                <Group
                    sx={groupStyle}
                    onDoubleClick={onDoubleClick}
                    onContextMenu={handleRightClick}
                    >
                        <RiGitRepositoryLine/>
                        <Text size='sm' sx={textStyle}>{registry.startsWith('https://') ? registry.slice(8) : registry}</Text>
                </Group>
            </Menu.Target>
            
            <Menu.Dropdown>
            {contextMenuCommands.map(cmd =>
            <Menu.Item
                key={cmd.id}
                color={cmd.color}
                icon={cmd.icon}
                onClick={() => onConfirmDelete(registryToDelete)}
            >
                {cmd.shortTitle}
            </Menu.Item>
            )}
            </Menu.Dropdown>
        
        </Menu>
    )
}

const groupStyle = theme => ({
    padding: '3px 0 3px 8px',
    borderRadius: 3,
    cursor: 'grab',
    flexWrap: 'nowrap',
    '&:hover': {
        backgroundColor: theme.colors.dark[5]
    }
})

const textStyle = theme => ({
    flexGrow: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    userSelect: 'none'
})



const menuStyles = theme => ({
    dropdown: {
        backgroundColor: theme.colors.dark[5]
    }
})