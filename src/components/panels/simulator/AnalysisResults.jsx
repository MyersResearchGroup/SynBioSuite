import React, { useContext, useMemo, useRef } from 'react'
import { Button, Container, Group, ScrollArea, Space, Center, Title, useMantineTheme } from '@mantine/core'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { useChartLegend } from './ChartLegend'
import ChartOptions from './ChartOptions'
import LineChart from './LineChart'
import { PanelContext } from './SimulatorPanel'
import { VscGraphLine } from "react-icons/vsc"
import AdditionalButtons from './AdditionalButtons'
import { betterMax, titleFromRunFileName } from "../../../modules/util"
import { exportToPNG } from '../../../modules/export'
import { titleFromFileName } from '../../../redux/hooks/workingDirectoryHooks'


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

    // create ref and handler for exporting images
    const resultsConainerRef = useRef()
    const handleImageExport = () => {
        exportToPNG(
            resultsConainerRef,
            titleFromFileName(panelId),
            chartOptions.useWhiteBackground ?
                '#ffffff' : mantineTheme.colors.dark[7]
        )
    }

    // calculate y-domain from all data so all charts have
    // the same scaling
    const yDomain = useMemo(() => {
        const indecesShowing = chartLegend?.series.map(s => s.dataIndex) || []
        return results && [
            0,
            Math.ceil(
                betterMax(
                    Object.values(results).map(
                        dataSet => dataSet.slice(1).map(
                            entry => entry.filter((_, i) => indecesShowing.includes(i))
                        ).flat()
                    ).flat()
                ) / 10
            ) * 10
        ]
    }, [results, chartLegend?.series])

    return (
        <>
            <Group position='right' spacing={20} p={20}>
                <Button variant='outline' leftIcon={<VscGraphLine />} onClick={chartLegend.openSeriesSelector}>Select Series</Button>
                <ChartOptions />
                <AdditionalButtons
                    panelId={panelId}
                    results={results}
                    handleImageExport={handleImageExport}
                    randomizeColors={chartLegend.randomizeColors}
                    whiteBg={chartOptions.useWhiteBackground}
                />
            </Group>
            <ScrollArea style={{ height: `calc(100vh - 170px)` }}>
                {results && chartLegend.legend.props.series.length ?
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
                    :
                    <Center><Title>No Series Selected!</Title></Center>
                }
                <Space h={60} />
            </ScrollArea>
            {chartLegend?.selectionModal}
        </>
    )
}

const resultsContainerStyle = (whiteBg, width) => theme => ({
    ...(whiteBg && { backgroundColor: 'white' }),
    width: width + '%'
})