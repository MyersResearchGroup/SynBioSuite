import { Tabs } from '@mantine/core'
import AnalysisWizard from './AnalysisWizard'
import { createContext } from 'react'
import AnalysisResults from './AnalysisResults'
import PanelSaver from "../PanelSaver"


export const PanelContext = createContext()

const TabValues = {
    SETUP: "setup",
    RESULTS: "results"
}


export default function SimulatorPanel({ id }) {

    return (
        <PanelContext.Provider value={id}>
            <Tabs defaultValue={TabValues.SETUP} styles={tabStyles}>
                <Tabs.List>
                    <Tabs.Tab value={TabValues.SETUP}>Setup</Tabs.Tab>
                    <Tabs.Tab value={TabValues.RESULTS}>Results</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value={TabValues.SETUP}>
                    <AnalysisWizard />
                </Tabs.Panel>
                <Tabs.Panel value={TabValues.RESULTS}>
                    <AnalysisResults />
                </Tabs.Panel>
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
    },
    tabsList: {
        // backgroundColor: theme.colors.dark[6]
    }
})