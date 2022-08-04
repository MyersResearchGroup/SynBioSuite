import { Badge } from '@mantine/core'
import React, { useContext } from 'react'
import { usePanelProperty } from '../../../redux/slices/panelsSlice'
import { PanelContext } from './SimulatorPanel'

export default function StatusBadge() {

    const panelId = useContext(PanelContext)
    const running = usePanelProperty(panelId, 'running')

    return running ?
        <div style={{ position: 'relative' }}>
            <Badge 
            sx={badgeStyle}
            color="green"
            size='md'
            variant='dot'
            >
                Running
            </Badge>
        </div> :
        <></>
}

const badgeStyle = theme => ({
    position: 'absolute',
    top: 10,
    right: 30
})