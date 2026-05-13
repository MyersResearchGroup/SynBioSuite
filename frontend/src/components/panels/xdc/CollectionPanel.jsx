import { ScrollArea, Space, Tabs } from '@mantine/core'
import { createContext } from 'react'
import PanelSaver from "../PanelSaver"
import { useState, useContext } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import CollectionWizard from './CollectionWizard'
import CollectionUploads from './CollectionUploads'


export const PanelContext = createContext()

const TabValues = {
    UPLOAD: "UPLOAD",
    RESULTS: "RESULTS"
}


export default function CollectionPanel({ id }) {
 
    const [activeTab, setActiveTab] = useState(TabValues.UPLOAD);
    const [uploads] = usePanelProperty(id, 'uploads', false, [])
    const hasUploads = (uploads?.length ?? 0) > 0

   return (
       <PanelContext.Provider value={id}>
            <Tabs value={activeTab} onTabChange={setActiveTab} styles={tabStyles} keepMounted={false}>
                <Tabs.List>
                    <Tabs.Tab value={TabValues.UPLOAD}>UPLOAD</Tabs.Tab>
                    {hasUploads && <Tabs.Tab value={TabValues.RESULTS}>RESULTS</Tabs.Tab>}
                </Tabs.List>

                <Tabs.Panel value={TabValues.UPLOAD}>
                    <CollectionWizard />
                    <ScrollArea style={{ height: 'calc(100vh - 93px)' }}>
                        <Space h={20} />
                    </ScrollArea>
                </Tabs.Panel>

                {hasUploads && (
                    <Tabs.Panel value={TabValues.RESULTS}>
                        <CollectionUploads />
                    </Tabs.Panel>
                )}
            </Tabs>
            <PanelSaver id={id} />
       </PanelContext.Provider>
    )
}

const tabStyles = theme => ({
    tab: {
        width: 120,
        textTransform: 'uppercase',
        fontWeight: 600
    }
})