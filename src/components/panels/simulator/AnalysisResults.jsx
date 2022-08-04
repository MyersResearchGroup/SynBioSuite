import { Container, ScrollArea, Space } from '@mantine/core'
import React from 'react'
import { useContext } from 'react'
import { usePanelProperty } from '../../../redux/slices/panelsSlice'
import { useChartLegend } from './ChartLegend'
import ChartOptions from './ChartOptions'
import LineChart from './LineChart'
import { PanelContext } from './SimulatorPanel'

export default function AnalysisResults() {

    const panelId = useContext(PanelContext)
    const results = usePanelProperty(panelId, "results")

    const chartLegend = useChartLegend({
        seriesLabels: results ? Object.values(results)[0][0] : []
    })

    const chartOptions = {
        showTitles: usePanelProperty(panelId, "chartOption_showTitles"),
        height: usePanelProperty(panelId, "chartOption_height"),
        gapBetween: usePanelProperty(panelId, "chartOption_gapBetween"),
        showLegendWithEvery: usePanelProperty(panelId, "chartOption_showLegendWithEvery"),
    }

    // calculate y-domain from all data so all charts have
    // the same scaling
    const yDomain = results && [
        0,
        Math.ceil(
            Math.max(
                ...Object.values(results).map(
                    dataSet => dataSet
                        .slice(1)
                        .map(entry => entry.slice(1))
                        .flat()
                )
                    .flat()
            ) / 10
        ) * 10
    ]


    return (
        <>
            <ChartOptions />
            <ScrollArea style={{ height: `calc(100vh - 170px)` }}>
                {results &&
                    <Container pt={20}>
                        {Object.entries(results).map(([fileName, resultData], i) =>
                            <React.Fragment key={i}>
                                <LineChart
                                    data={resultData.slice(1)}
                                    series={chartLegend?.series}
                                    title={chartOptions.showTitles && titleFromRunFileName(fileName)}
                                    height={chartOptions.height}
                                    mt={chartOptions.height * chartOptions.gapBetween / 100 - 60}
                                    yDomain={yDomain}
                                />
                                {chartOptions.showLegendWithEvery && chartLegend.legend}
                            </React.Fragment>
                        )}
                        {!chartOptions.showLegendWithEvery && <>
                            <Space h={20} />
                            {chartLegend?.legend}
                        </>}
                        <Space h={60} />
                    </Container>
                }
            </ScrollArea>
            {chartLegend?.selectionModal}
        </>
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