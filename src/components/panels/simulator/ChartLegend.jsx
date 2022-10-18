import { Center, Checkbox, ColorPicker, Modal, Popover, SimpleGrid, Stack, Switch, Text, useMantineTheme } from '@mantine/core'
import { useDebouncedValue, useListState } from '@mantine/hooks'
import { LegendItem, LegendLabel, LegendOrdinal } from '@visx/legend'
import { scaleOrdinal } from '@visx/scale'
import { useState, useContext, useEffect } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { PanelContext } from './SimulatorPanel'
import * as colorScheme from "../../../modules/colorScheme"


export function useChartLegend({ seriesLabels = [] }) {

    const panelId = useContext(PanelContext)

    // create set of line colors
    const mantineTheme = useMantineTheme()
    const lineColors = Object.values(mantineTheme.colors).map(colorSeries => colorSeries[4])

    // series selection states
    const [seriesInStore, setSeriesInStore] = usePanelProperty(panelId, "chartSeries", false)
    const [series, seriesHandlers] = useListState([])
    const seriesShowing = (series || []).filter(s => s.show)

    // when series labels changes, create series states
    useEffect(() => {
        seriesLabels?.length && seriesHandlers.setState(
            seriesLabels.map((label, i) => ({
                dataIndex: i,
                key: label,
                show: seriesInStore?.[label]?.show ?? (i > 0 && i <= 10),
                stroke: seriesInStore?.[label]?.stroke || randomFromSet(lineColors),
                bold: seriesInStore?.[label]?.bold || false,
            }))
        )
    }, [seriesLabels])

    // debounce series and put in global stores
    const [debouncedSeries] = useDebouncedValue(series, 300)
    useEffect(() => {
        series && setSeriesInStore(Object.fromEntries(
            series.map(({ key, show, stroke, bold }) => [
                key,
                { show, stroke, bold }
            ])
        ))
    }, [debouncedSeries])

    // series selector modal
    const [seriesSelectorOpened, setSeriesSelectorOpened] = useState(false)

    // function for randomizing colors
    const randomizeColors = () => {
        const newColors = colorScheme.randomize(
            Object.values(mantineTheme.colors).slice(2),
            seriesShowing.length
        )
        seriesShowing.forEach(series => seriesHandlers.setItemProp(
            series.dataIndex,
            'stroke',
            newColors.next().value
        ))
    }

    return {
        series: seriesShowing,
        legend:
            <Legend
                series={seriesShowing}
                onPropChange={(seriesKey, propKey, newValue) => seriesHandlers.setItemProp(series.findIndex(s => s.key == seriesKey), propKey, newValue)}
            />,
        selectionModal:
            <SeriesModal
                series={series}
                onSeriesChange={(index, checked) => seriesHandlers.setItemProp(index, 'show', checked)}
                modalOpen={seriesSelectorOpened}
                setModalOpen={setSeriesSelectorOpened}
            />,
        openSeriesSelector: () => setSeriesSelectorOpened(true),
        randomizeColors,
    }
}



function Legend({ series, onPropChange }) {

    const panelId = useContext(PanelContext)
    const mantineTheme = useMantineTheme()

    // grab chart options
    const chartOptions = {
        truncateSpeciesNames:
            usePanelProperty(panelId, "chartOption_trucateSpeciesNames"),
        gapBetween:
            usePanelProperty(panelId, "chartOption_gapBetween"),
        useWhiteBackground:
            usePanelProperty(panelId, "chartOption_useWhiteBackground"),
    }

    // Create legend
    const legendScale = scaleOrdinal({
        domain: series.map(s => s.key),
        range: series.map(s => s.stroke),
    })

    const getSeriesProp = (seriesKey, propKey) =>
        series.find(s => s.key == seriesKey)?.[propKey]

    return (
        <Stack align='center'>
            <LegendOrdinal scale={legendScale} >
                {chartLabels => (
                    <div style={legendStyle(chartOptions.useWhiteBackground, mantineTheme)}>
                        {chartLabels.map((chartLabel, i) => (
                            <Popover
                                key={`legend-${i}`}
                                width={260}
                                position="top"
                            >
                                <Popover.Target>
                                    <div style={legendItemWrapperStyle}>
                                        <LegendItem style={legendItemStyle(chartOptions.useWhiteBackground, mantineTheme)}>
                                            <div style={legendGlyphStyle(chartLabel.value)}></div>
                                            <LegendLabel align="left" margin="0 0 0 4px">
                                                {chartOptions.truncateSpeciesNames ?
                                                    truncateSpeciesNames(chartLabel.text) :
                                                    chartLabel.text}
                                            </LegendLabel>
                                        </LegendItem>
                                    </div>
                                </Popover.Target>
                                <Popover.Dropdown>
                                    <Stack align="center">
                                        <ColorPicker
                                            value={chartLabel.value}
                                            onChange={newColor => onPropChange(chartLabel.text, "stroke", newColor)}
                                        />
                                        <Switch
                                            label="Emphasize"
                                            checked={getSeriesProp(chartLabel.text, "bold")}
                                            onChange={event => onPropChange(chartLabel.text, "bold", event.currentTarget.checked)}
                                        />
                                    </Stack>
                                </Popover.Dropdown>
                            </Popover>
                        ))}
                    </div>
                )}
            </LegendOrdinal>
            {/* <Text
                onClick={openSeriesSelector}
                sx={smallLinkStyle}
            >
                Select different series
            </Text> */}
        </Stack>
    )
}

function SeriesModal({ series, onSeriesChange, modalOpen, setModalOpen }) {

    return (
        <Modal
            size='xl'
            opened={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Select series"
        >
            <SimpleGrid cols={3}>
                {(series || []).map((s, i) => (
                    <Checkbox
                        key={s.key}
                        label={s.key}
                        checked={s.show}
                        onChange={event => onSeriesChange(i, event.currentTarget.checked)}
                    />
                ))}
            </SimpleGrid>
        </Modal>
    )
}


function randomFromSet(set) {
    return set[Math.floor(Math.random() * set.length)]
}

export function truncateSpeciesNames(name) {
    return name.match(/([\w\W]*)_[0-9]+$/)?.[1] || name
}


const legendStyle = (whiteBg, theme) => ({
    border: '1px solid ' + (
        whiteBg ? theme.colors.dark[4] : theme.colors.gray[3]
    ),
    display: 'inline-flex',
    flexWrap: 'wrap',
    maxWidth: '100%',
    padding: 8,
    borderRadius: 4
})

const legendItemWrapperStyle = {
    cursor: 'pointer',
    margin: '0 10px',
}

const legendItemStyle = (whiteBg, theme) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    ...(whiteBg && { color: theme.colors.dark[5] })
})

const legendGlyphStyle = color => ({
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: color
})

const smallLinkStyle = theme => ({
    fontSize: '0.8em',
    color: theme.colors.gray[6],
    zIndex: 100,
    cursor: 'pointer',
    '&:hover': {
        textDecoration: 'underline'
    }
})