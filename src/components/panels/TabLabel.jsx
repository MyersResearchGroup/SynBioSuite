import React from 'react'
import { Group, ActionIcon } from '@mantine/core'
import { IoClose } from "react-icons/io5"
import { SVGIcon } from '../../icons'

export default function TabLabel({ title, icon, id, onClose }) {

    const handleClose = event => {
        onClose(id)
        event.stopPropagation()
    }

    return (
        <Group sx={groupStyle} spacing='sm' >
            <SVGIcon icon={icon} size='md' />
            <span style={spanStyle}>{title}</span>
            <ActionIcon sx={iconStyle} onMouseUp={handleClose} ><IoClose /></ActionIcon>
        </Group>
    )
}

const spanStyle = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: '1.5em',
    width: 150,
    fontSize: 14,
}

const groupStyle = theme => ({
    padding: '8px 10px 8px 15px',
    background: 'inherit',
    fontSize: 18,
})

const iconStyle = theme => {
    return {
        color: theme.other.inactiveColor,
        fill: theme.other.inactiveColor,
        fontSize: 20,
        '&:hover': {
            color: theme.colors.red[5],
            fill: theme.colors.red[5],
        }
    }
}
