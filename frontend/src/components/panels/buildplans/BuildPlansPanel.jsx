import { ScrollArea, Space, Tabs } from '@mantine/core'
import { createContext } from 'react'
import PanelSaver from "../PanelSaver"
import { useState } from 'react'
import BuildPlansWizard from './BuildPlansWizard'

//contains info that is written to json
export const PanelContext = createContext()

const TabValues = {
    FULL: "full build",
    ASSEMBLY: "DNA assembly",
    TRANSFORMATION: "transformations",
    PLATING: "plating"
}

export default function BuildPlansPanel({ id }) {


    const [activeTab, setActiveTab] = useState(TabValues.FULL);

    return (
        <>
         <PanelContext.Provider value={id}>
                <Tabs value={activeTab} onTabChange={setActiveTab} styles={tabStyles} keepMounted = {false}>
                    <Tabs.List>
                        <Tabs.Tab value={TabValues.FULL}>{TabValues.FULL}</Tabs.Tab>
                        <Tabs.Tab value={TabValues.ASSEMBLY}>{TabValues.ASSEMBLY}</Tabs.Tab>
                        <Tabs.Tab value={TabValues.TRANSFORMATION}>{TabValues.TRANSFORMATION}</Tabs.Tab>
                        <Tabs.Tab value={TabValues.PLATING}>{TabValues.PLATING}</Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value={TabValues.FULL}>
                        <ScrollArea style={{ height: 'calc(100vh - 93px)' }}>
                            <BuildPlansWizard />
                            <Space h={20} />
                        </ScrollArea>
                    </Tabs.Panel>
                </Tabs>
                <PanelSaver id={id} />
            </PanelContext.Provider>
        </>
    )
}

const tabStyles = theme => ({
    tab: {
        textTransform: 'uppercase',
        fontWeight: 600
    },
    tabsList: {
        // backgroundColor: theme.colors.dark[6]
    }
})