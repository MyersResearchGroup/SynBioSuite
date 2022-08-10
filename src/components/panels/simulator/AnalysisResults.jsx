import { Button, Container, Group, ScrollArea, Space, useMantineTheme } from '@mantine/core'
import React from 'react'
import { useRef } from 'react'
import { useContext } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { useChartLegend } from './ChartLegend'
import ChartOptions from './ChartOptions'
import LineChart from './LineChart'
import { PanelContext } from './SimulatorPanel'
import { exportComponentAsPNG } from 'react-component-export-image'
import { VscGraphLine } from "react-icons/vsc"
import AdditionalButtons from './AdditionalButtons'


export default function AnalysisResults() {

    const panelId = useContext(PanelContext)
    const results = usePanelProperty(panelId, "results")
    const mantineTheme = useMantineTheme()

    // create chart legend
    const chartLegend = useChartLegend({
        seriesLabels: results ? Object.values(results)[0][0] : []
    })

    // grab chart options from store
    const chartOptions = {
        showTitles: usePanelProperty(panelId, "chartOption_showTitles"),
        width: usePanelProperty(panelId, "chartOption_width"),
        height: usePanelProperty(panelId, "chartOption_height"),
        gapBetween: usePanelProperty(panelId, "chartOption_gapBetween"),
        showLegendWithEvery: usePanelProperty(panelId, "chartOption_showLegendWithEvery"),
        useWhiteBackground: usePanelProperty(panelId, "chartOption_useWhiteBackground"),
    }

    // create ref and handler for exporting
    const resultsConainerRef = useRef()
    const handleExport = () => {
        exportComponentAsPNG(resultsConainerRef, {
            fileName: panelId + '.png',
            html2CanvasOptions: {
                backgroundColor: chartOptions.useWhiteBackground ?
                    '#ffffff' : mantineTheme.colors.dark[7]
            }
        })
    }

    // calculate y-domain from all data so all charts have
    // the same scaling
    const indecesShowing = chartLegend?.series.map(s => s.dataIndex) || []
    const yDomain = results && [
        0,
        Math.ceil(
            Math.max(
                ...Object.values(results).map(
                    dataSet => dataSet
                        .slice(1)
                        .map(
                            entry => entry.filter((_, i) => indecesShowing.includes(i))
                        )
                        .flat()
                )
                    .flat()
            ) / 10
        ) * 10
    ]

    return (
        <>
            <Group position='right' spacing={20} p={20}>
                <Button variant='outline' leftIcon={<VscGraphLine />} onClick={chartLegend.openSeriesSelector}>Select Series</Button>
                <ChartOptions />
                <AdditionalButtons
                    handleExport={handleExport}
                    randomizeColors={chartLegend.randomizeColors}
                />
            </Group>
            <ScrollArea style={{ height: `calc(100vh - 170px)` }}>
                {results &&
                    <Container
                        pt={20}
                        sx={resultsContainerStyle(chartOptions.useWhiteBackground, chartOptions.width)}
                        ref={resultsConainerRef}
                    >
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
                        <Space h={20} />
                    </Container>
                }
                <Space h={60} />
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

const resultsContainerStyle = (whiteBg, width) => theme => ({
    ...(whiteBg && { backgroundColor: 'white' }),
    width: width + '%'
})