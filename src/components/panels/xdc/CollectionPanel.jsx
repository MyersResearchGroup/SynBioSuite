import { Badge, ScrollArea, Space, Tabs } from '@mantine/core'
//import AnalysisWizard from './AnalysisWizard'
import { createContext } from 'react'
//import AnalysisResults from './AnalysisResults'
import PanelSaver from "../PanelSaver"
import { useSelector } from 'react-redux'
import { panelsSelectors } from '../../../redux/hooks/panelsHooks'
import { createSelector } from '@reduxjs/toolkit'
//import StatusBadge from './StatusBadge'
import { useState } from 'react'


export const PanelContext = createContext()

const TabValues = {
    SETUP: "import",
    REVIEW: "results",
    UPLOAD: "upload"
}


export default function CollectionPanel({ id }) {
 
    const [activeTab, setActiveTab] = useState(TabValues.SETUP);

    const reviewTab = () => {
        setActiveTab(TabValues.RESULTS)
    }

    const uploadTab = () => {
        setActiveTab(TabValues.UPLOAD)
    }

   return (
       <PanelContext.Provider value={id}>
            <Tabs value={activeTab} onTabChange={setActiveTab} styles={tabStyles} keepMounted={false}>
                <Tabs.List>
                    <Tabs.Tab value={TabValues.SETUP}>Setup</Tabs.Tab>
                    <Tabs.Tab value={TabValues.REVIEW}>Review</Tabs.Tab>
                    <Tabs.Tab value={TabValues.UPLOAD}>Upload</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value={TabValues.SETUP}>
                    <ScrollArea style={{ height: 'calc(100vh - 93px)' }}>
                        <h1>Import</h1>
                        <Space h={20} />
                    </ScrollArea>
                </Tabs.Panel>
                <Tabs.Panel value={TabValues.REVIEW}>Second panel</Tabs.Panel>
                <Tabs.Panel value={TabValues.UPLOAD}>Third panel</Tabs.Panel>
            </Tabs>
            <PanelSaver id={id} />
       </PanelContext.Provider>
    )
    /*
        <PanelContext.Provider value={id}>
            <StatusBadge />
            <Tabs value={activeTab} onTabChange={setActiveTab} styles={tabStyles} keepMounted = {false}>
                <Tabs.List>
                    <Tabs.Tab value={TabValues.SETUP}>Setup</Tabs.Tab>
                </Tabs.List>

            </Tabs>
            <PanelSaver id={id} />
        </PanelContext.Provider>
    
    */
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