import React, { forwardRef } from 'react'
import { Box, Tabs as MantineTabs, Text, Tooltip } from "@mantine/core"
import TabLabel from './TabLabel'
import { useClosePanel, usePanelProperty, usePanelType } from '../../redux/hooks/panelsHooks'
import { titleFromFileName } from '../../redux/hooks/workingDirectoryHooks'

const Tab = forwardRef(({ id, ...props }, ref) => {
    
    const fileHandle = usePanelProperty(id, 'fileHandle')
    const name = usePanelProperty(id, 'name')
    const panelType = usePanelType(id)
    const closePanel = useClosePanel()

    const panelTitle = panelType?.title || 'Panel'
    const panelDescription = panelType?.tooltip?.description || 'Open file workspace panel.'
    const panelInstructions = panelType?.tooltip?.instructions || 'Use this tab to view and edit its content.'
    const fileLabel = name || (fileHandle ? titleFromFileName(fileHandle.name) : id)

    return (
        <Tooltip
            label={(
                <Box>
                    <Text fw={700}>{panelTitle}</Text>
                    <Text size="xs">{panelDescription}</Text>
                    <Text size="xs" c="gray.3">{panelInstructions}</Text>
                    <Text size="xs" mt={4}>File: {fileLabel}</Text>
                </Box>
            )}
            openDelay={500}
            withArrow
            multiline
            maw={320}
        >

            <MantineTabs.Tab value={id} ref={ref} {...props}>
                <TabLabel
                title={fileLabel}
                    icon={panelType?.icon}
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
