import React, { forwardRef } from 'react'
import { Tabs as MantineTabs } from "@mantine/core"
import TabLabel from './TabLabel'
import { useClosePanel, usePanelProperty, usePanelType } from '../../redux/hooks/panelsHooks'
import { titleFromFileName } from '../../redux/hooks/workingDirectoryHooks'

const Tab = forwardRef(({ id, ...props }, ref) => {

    const fileHandle = usePanelProperty(id, 'fileHandle')
    const panelType = usePanelType(id)
    const closePanel = useClosePanel()

    return (
        <MantineTabs.Tab value={id} ref={ref} {...props}>
            <TabLabel
                title={titleFromFileName(fileHandle.name)}
                icon={panelType.icon}
                id={id}
                onClose={closePanel}
            />
        </MantineTabs.Tab>
    )
})

function Content({ id, ...props }) {

    const panelType = usePanelType(id)

    return (
        <MantineTabs.Panel value={id} {...props}>
            <panelType.component id={id} />
        </MantineTabs.Panel>
    )
}


export default {
    Tab,
    Content
}

