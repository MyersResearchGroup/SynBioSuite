import React, { forwardRef } from 'react'
import { Tabs as MantineTabs } from "@mantine/core"
import TabLabel from './TabLabel'
import { useClosePanel, usePanelProperty, usePanelType } from '../../redux/hooks/panelsHooks'
import { titleFromFileName } from '../../redux/hooks/workingDirectoryHooks'
import { BiWorld } from "react-icons/bi"
import SynbioHubPanel from './SynbioHubPanel'

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
    const fileHandle = usePanelProperty(id, 'fileHandle')

    return (
        <MantineTabs.Panel value={id} {...props}>
            <panelType.component id={id} fileObjectTypeId={fileHandle.objectType} />
        </MantineTabs.Panel>
    )
}

const SynBioHubTab = forwardRef(({ id, ...props }, ref) => {


    const closePanel = useClosePanel()

    return (
        <MantineTabs.Tab value={id} ref={ref} {...props}>
            <TabLabel
                title={"TEST"}
                icon={BiWorld}
                id={id}
                onClose={closePanel}
            />
        </MantineTabs.Tab>
    )
})

function SBHContent({ id, ...props }) {
    // const panelType = usePanelType(id)
    // const fileHandle = usePanelProperty(id, 'fileHandle')

    return (
        <MantineTabs.Panel value={id} {...props}>
            <SynbioHubPanel/>
        </MantineTabs.Panel>
    )
}
export default {
    Tab,
    Content,
    SynBioHubTab,
    SBHContent
}

