import { ScrollArea, Space, Tabs } from '@mantine/core'
import { createContext } from 'react'
import PanelSaver from "../PanelSaver"
import { useState } from 'react'
import TransformationWizard from './TransformationWizard'

//contains info that is written to json
export const PanelContext = createContext()

const TabValues = {
    SETUP: "setup"
}

export default function TransformationPanel({ id }) {


    const [activeTab, setActiveTab] = useState(TabValues.SETUP);

    return (
        <>
         <PanelContext.Provider value={id}>
                <Tabs value={activeTab} onTabChange={setActiveTab} styles={tabStyles} keepMounted = {false}>
                    <Tabs.List>
                        <Tabs.Tab value={TabValues.SETUP}>Setup</Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value={TabValues.SETUP}>
                        <ScrollArea style={{ height: 'calc(100vh - 93px)' }}>
                            <TransformationWizard />
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
        width: 120,
        textTransform: 'uppercase',
        fontWeight: 600
    },
    tabsList: {
        // backgroundColor: theme.colors.dark[6]
    }
})