
import { cloneElement } from 'react'
import { useMantineTheme } from '@mantine/core'
import FolderIcon from './folder.svg?component'
import FileIcon from './file.svg?component'
import CanvasIcon from './canvas.svg?component'
import SimulationIcon from './simulation.svg?component'
import RemoteControlIcon from './remote-control.svg?component'


export {
    FolderIcon,
    FileIcon,
    CanvasIcon,
    SimulationIcon,
    RemoteControlIcon
}


export function SVGIcon({ icon: Icon, size = 'md', color, ...props }) {

    const theme = useMantineTheme()

    const parsedSize = typeof size == 'string' && sizes[size] || size

    const iconStyle = {
        width: parsedSize,
        height: parsedSize,
        ...(color && { fill: color, stroke: color })
    }

    return (
        typeof Icon == 'function' ?
            <Icon style={iconStyle} {...props} /> :
            cloneElement(Icon, { style: iconStyle, ...props })
    )
}

const sizes = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 28,
    xl: 36
}

