
import { cloneElement } from 'react'
import { useMantineTheme } from '@mantine/core'
import FolderIcon from './folder.svg?component'
import FileIcon from './file.svg?component'
import CanvasIcon from './canvas.svg?component'
import SimulationIcon from './simulation.svg?component'
import RemoteControlIcon from './remote-control.svg?component'
import BugReport from './bug-report.svg?component'
import ProfileGreen from './profile-green.svg?component'
import ProfileOrange from './profile-orange.svg?component'
import ProfileRed from './profile-red.svg?component'
import ProfileWhite from './profile-white.svg?component'
import SynBioHub from './synbiohub.svg?component'


export {
    FolderIcon,
    FileIcon,
    CanvasIcon,
    SimulationIcon,
    RemoteControlIcon,
    BugReport,
    ProfileGreen,
    ProfileOrange,
    ProfileRed,
    ProfileWhite
    SynBioHub
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

