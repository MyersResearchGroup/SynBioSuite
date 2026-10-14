import { Group, Text } from '@mantine/core'
import React from 'react'

export default function DragObject({ icon, type, title, fileId, uploadInfo, ...props }) {

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
            {...props}
            sx={(theme) => ({...groupStyle(theme),
                color: uploadInfo!=null?theme.colors.green[6]:undefined,
            })}
            draggable
            onDragStart={handleDragStart}
        >
            {icon}
            <Text
                size="sm"
                sx={(theme) => ({
                    ...textStyle(theme),
                    color: uploadInfo!=null?theme.colors.green[6]:undefined,
                })}
            >
            {title}
            </Text>
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