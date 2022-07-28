import { Container, ScrollArea, Space, Tabs } from '@mantine/core'
import AnalysisWizard from './AnalysisWizard'
import LineChart from "./LineChart"
import { useMarkPanelUnsavedEffect, usePanel } from '../../../redux/slices/panelSlice'
import { createContext } from 'react'
import { useDebouncedValue } from '@mantine/hooks'

export const PanelContext = createContext()

export default function SimulatorPanel({ id }) {

    const [panel, usePanelState] = usePanel(id)

    const [activeTab, setActiveTab] = usePanelState('activeTab', "setup")

    // debounce state and mark panel as unsaved when it changes
    const [debouncedState] = useDebouncedValue(panel.state, 200)
    useMarkPanelUnsavedEffect(id, [debouncedState])

    return (
        <PanelContext.Provider value={[panel, usePanelState]}>
            <Tabs styles={tabStyles} value={activeTab} onTabChange={setActiveTab} >
                <Tabs.List>
                    <Tabs.Tab value="setup">Setup</Tabs.Tab>
                    <Tabs.Tab value="results">Results</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="setup">
                    <AnalysisWizard />
                </Tabs.Panel>
                <Tabs.Panel value="results">
                    <ScrollArea style={{ height: 600 }}>
                        <Container>
                            {panel.state.results ?
                                Object.values(panel.state.results).map((resultData, i) =>
                                    <>
                                        <Space h='xl' key={'space' + i} />
                                        <LineChart
                                            key={i}
                                            data={resultData.slice(1)}
                                            labels={resultData[0]}
                                            showSeries={[1]}
                                            title={`Run ${i + 1}`}
                                        />
                                        <Space h='xl' key={'space2' + i} />
                                    </>
                                ) :
                                <></>}
                        </Container>
                    </ScrollArea>
                </Tabs.Panel>
            </Tabs>
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