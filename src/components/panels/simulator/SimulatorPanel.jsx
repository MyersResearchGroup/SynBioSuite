import { useState } from 'react'
import { Container, ScrollArea, Space, Tabs } from '@mantine/core'
import AnalysisWizard from './AnalysisWizard'
import LineChart from "./LineChart"
import { usePanel, useSavePanel } from '../../../redux/slices/panelSlice'
import { createContext } from 'react'
import { useEffect } from 'react'
import { useDebouncedValue } from '@mantine/hooks'

export const PanelContext = createContext()

export default function SimulatorPanel({ id }) {

    const [panel, usePanelState] = usePanel(id)

    const [activeTab, setActiveTab] = usePanelState('activeTab', 0)

    // handle saving
    const [saved, save] = useSavePanel(id)
    const [debouncedState] = useDebouncedValue(panel.state, 5000)

    useEffect(() => {
        console.debug("Auto saving...")
        save().then(() => {
            console.debug("Saved.")
        })
    }, [debouncedState])

    return (
        <PanelContext.Provider value={[panel, usePanelState]}>
            <Tabs styles={tabStyles} active={activeTab} onTabChange={setActiveTab}>
                <Tabs.Tab label="Setup" >
                    <AnalysisWizard />
                </Tabs.Tab>
                <Tabs.Tab label="Results" >
                    <ScrollArea style={{ height: 600 }}>
                        <Container>
                            {panel.state.results ?
                                Object.values(panel.state.results).map((resultData, i) =>
                                    <>
                                        <Space h='xl' key={'space'+i} />
                                        <LineChart
                                            key={i}
                                            data={resultData.slice(1)}
                                            labels={resultData[0]}
                                            showSeries={[1]}
                                            title={`Run ${i + 1}`}
                                        />
                                        <Space h='xl' key={'space'+(i*2)} />
                                    </>
                                ) :
                                <></>}
                        </Container>
                    </ScrollArea>
                </Tabs.Tab>
            </Tabs>
        </PanelContext.Provider>
    )
}

const tabStyles = theme => ({
    tabControl: {
        width: 120,
        textTransform: 'uppercase',
        fontWeight: 600
    },
    tabsList: {
        // backgroundColor: theme.colors.dark[6]
    }
})