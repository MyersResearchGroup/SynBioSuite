import { Button, Center, Text } from '@mantine/core'
import React from 'react'

export default function FolderSelect({ onSelect, children }) {

    const handleClick = async () => {
        const directoryHandle = await window.showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'desktop'
        })
        
        onSelect?.(directoryHandle)
    }

    return (
        <Button onClick={handleClick}>{children || "Open Folder"}</Button>
    )
}
