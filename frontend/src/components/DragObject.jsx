import { Group, Text } from '@mantine/core'
import React from 'react'

export default function DragObject({ icon, type, title, fileId, ...props }) {

    const handleDragStart = event => {
        event.dataTransfer.setData("name", title)
        event.dataTransfer.setData("type", type)
        event.dataTransfer.setData("fileId", fileId)

        // can't access values of data on dragover for security reason
        // so we'll do a workaround
        event.dataTransfer.setData(`type:${type}`, "")

        event.dataTransfer.effectAllowed = 'link'
    }

    return (
        <Group
            sx={groupStyle}
            draggable={true}
            onDragStart={handleDragStart}
            {...props}
        >
            {icon}
            <Text size='sm' sx={textStyle}>{title}</Text>
        </Group>
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