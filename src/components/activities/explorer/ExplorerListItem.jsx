import { Menu, Text } from '@mantine/core'
import React, { useState } from 'react'
import { useOpenPanel } from '../../../redux/slices/panelsSlice'
import { titleFromFileName, useFile } from '../../../redux/slices/workingDirectorySlice'
import DragObject from '../../DragObject'
import commands from "../../../commands"


export default function ExplorerListItem({ fileId, icon }) {

    const file = useFile(fileId)

    // handle opening of file
    const openPanel = useOpenPanel()
    const handleOpenFile = () => {
        openPanel(file)
    }

    // context menu states
    const [contextMenuOpen, setContextMenuOpen] = useState(false)

    // right click handler
    const handleRightClick = event => {
        event.preventDefault()
        setContextMenuOpen(true)
    }

    // command list
    const contextMenuCommands = [
        commands.FileDelete
    ]

    return (
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
                {/* have to wrap this in a div so it can add a ref */}
                <div>
                    <DragObject
                        title={titleFromFileName(file.name)}
                        fileId={fileId}
                        type={file.objectType}
                        icon={icon}
                        onDoubleClick={handleOpenFile}
                        onContextMenu={handleRightClick}
                    />
                </div>
            </Menu.Target>

            <Menu.Dropdown>
                {contextMenuCommands.map(cmd =>
                    <Menu.Item
                        key={cmd.id}
                        color={cmd.color}
                        icon={cmd.icon}
                        onClick={() => cmd.execute(fileId)}
                    >
                        {cmd.shortTitle}
                    </Menu.Item>
                )}
            </Menu.Dropdown>
        </Menu>
    )
}


const menuStyles = theme => ({
    dropdown: {
        backgroundColor: theme.colors.dark[5]
    }
})