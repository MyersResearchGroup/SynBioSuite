import React, { forwardRef } from 'react'
import { Tabs as MantineTabs, Tooltip } from "@mantine/core"
import TabLabel from './TabLabel'
import { useClosePanel, usePanelProperty, usePanelType } from '../../redux/hooks/panelsHooks'
import { titleFromFileName } from '../../redux/hooks/workingDirectoryHooks'

const Tab = forwardRef(({ id, ...props }, ref) => {
    
    const fileHandle = usePanelProperty(id, 'fileHandle')
    const panelType = usePanelType(id)
    const closePanel = useClosePanel()

    return (
        <Tooltip label={id} openDelay={800}>

            <MantineTabs.Tab value={id} ref={ref} {...props}>
                <TabLabel
                title={fileHandle ? titleFromFileName(fileHandle.name) : id}
                    icon={panelType.icon}
                    id={id}
                    onClose={closePanel}
                />
            </MantineTabs.Tab>
        </Tooltip>
    )
})

function Content({ id, ...props }) {
    const panelType = usePanelType(id)
    const fileHandle = usePanelProperty(id, 'fileHandle')

    return (
        <MantineTabs.Panel value={id} {...props}>
            <panelType.component id={id} fileObjectTypeId={fileHandle ? fileHandle.objectType : null} />
        </MantineTabs.Panel>
    )
}
export default {
    Tab,
    Content,
}

