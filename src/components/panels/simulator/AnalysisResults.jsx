import { Container, ScrollArea, Space } from '@mantine/core'
import React from 'react'
import { useContext } from 'react'
import { usePanelProperty } from '../../../redux/slices/panelsSlice'
import LineChart from './LineChart'
import { PanelContext } from './SimulatorPanel'

export default function AnalysisResults() {

    const panelId = useContext(PanelContext)
    const results = usePanelProperty(panelId, "results")

    return (
        <ScrollArea style={{ height: 600 }}>
            {results &&
                <Container>
                    {Object.entries(results).map(([fileName, resultData], i) =>
                        <div key={i}>
                            <Space h='xl' key={'space' + i} />
                            <LineChart
                                key={i}
                                data={resultData.slice(1)}
                                labels={resultData[0]}
                                showSeries={[0]}
                                title={titleFromRunFileName(fileName)}
                            />
                            <Space h='xl' key={'space2' + i} />
                        </div>
                    )}
                </Container>
            }
        </ScrollArea>
    )
}


function titleFromRunFileName(fileName) {
    let title = fileName
        .replace(".tsd", "")
        .replace("-", " ")

    title = title.slice(0, 1).toUpperCase() +
        title.slice(1)

    return title
}