import { Badge, ScrollArea, Space, Tabs } from '@mantine/core'
import { createContext } from 'react'
import PanelSaver from "../PanelSaver"
import { useSelector } from 'react-redux'
import { panelsSelectors } from '../../../redux/hooks/panelsHooks'
import { createSelector } from '@reduxjs/toolkit'
import { useState } from 'react'
import BuildWizard from './BuildWizard'

//contains info that is written to json
export const PanelContext = createContext()

const TabValues = {
    SETUP: "setup"
}

export default function BuildPanel({ id }) {


    const [activeTab, setActiveTab] = useState(TabValues.SETUP);

    const viewResultsTab = () => {
        setActiveTab(TabValues.RESULTS)
    }

    return (
        <>
         <PanelContext.Provider value={id}>
                <Tabs value={activeTab} onTabChange={setActiveTab} styles={tabStyles} keepMounted = {false}>
                    <Tabs.List>
                        <Tabs.Tab value={TabValues.SETUP}>Setup</Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value={TabValues.SETUP}>
                        <ScrollArea style={{ height: 'calc(100vh - 93px)' }}>
                            <BuildWizard handleViewResult = {viewResultsTab} />
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