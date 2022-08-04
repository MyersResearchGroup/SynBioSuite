import { Checkbox, ColorPicker, Modal, Popover, SimpleGrid, Stack, Text, useMantineTheme } from '@mantine/core'
import { useDebouncedValue, useListState } from '@mantine/hooks'
import { LegendItem, LegendLabel, LegendOrdinal } from '@visx/legend'
import { scaleOrdinal } from '@visx/scale'
import { useState, useContext, useEffect } from 'react'
import { usePanelProperty } from '../../../redux/slices/panelsSlice'
import { PanelContext } from './SimulatorPanel'

export function useChartLegend({ seriesLabels = [] }) {

    const panelId = useContext(PanelContext)

    // create set of line colors
    const mantineTheme = useMantineTheme()
    const lineColors = Object.values(mantineTheme.colors).map(colorSeries => colorSeries[4])

    // series selection states
    const [seriesInStore, setSeriesInStore] = usePanelProperty(panelId, "chartSeries", false)
    const [series, seriesHandlers] = useListState(seriesLabels.map((label, i) => ({
        dataIndex: i,
        key: label,
        show: seriesInStore?.[label]?.show ?? i != 0,
        stroke: seriesInStore?.[label]?.stroke || randomFromSet(lineColors)
    })))
    const seriesShowing = (series || []).filter(s => s.show)

    // debounce series and put in global stores
    const [debouncedSeries] = useDebouncedValue(series, 300)
    useEffect(() => {
        series && setSeriesInStore(Object.fromEntries(
            series.map(({ key, show, stroke }) => [
                key,
                { show, stroke }
            ])
        ))
    }, [debouncedSeries])

    // series selector modal
    const [seriesSelectorOpened, setSeriesSelectorOpened] = useState(false)

    return {
        series: seriesShowing,
        legend:
            <Legend
                series={seriesShowing}
                onColorChange={(seriesKey, newColor) => seriesHandlers.setItemProp(series.findIndex(s => s.key == seriesKey), 'stroke', newColor)}
                openSeriesSelector={() => setSeriesSelectorOpened(true)}
            />,
        selectionModal:
            <SeriesModal
                series={series}
                onSeriesChange={(index, checked) => seriesHandlers.setItemProp(index, 'show', checked)}
                modalOpen={seriesSelectorOpened}
                setModalOpen={setSeriesSelectorOpened}
            />
    }
}



function Legend({ series, onColorChange, openSeriesSelector }) {

    const panelId = useContext(PanelContext)
    const mantineTheme = useMantineTheme()

    // grab chart options
    const chartOptions = {
        truncateSpeciesNames:
            usePanelProperty(panelId, "chartOption_trucateSpeciesNames"),
        gapBetween:
            usePanelProperty(panelId, "chartOption_gapBetween"),
    }

    // Create legend
    const legendScale = scaleOrdinal({
        domain: series.map(s => s.key),
        range: series.map(s => s.stroke),
    })

    return (
        <Stack align='center'>
            <LegendOrdinal scale={legendScale} >
                {chartLabels => (
                    <div style={legendStyle(mantineTheme)}>
                        {chartLabels.map((chartLabel, i) => (
                            <Popover
                                key={`legend-${i}`}
                                width={260}
                                position="top"
                            >
                                <Popover.Target>
                                    <div style={legendItemWrapperStyle}>
                                        <LegendItem style={legendItemStyle}>
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
                                    <ColorPicker
                                        value={chartLabel.value}
                                        onChange={newColor => onColorChange(chartLabel.text, newColor)}
                                    />
                                </Popover.Dropdown>
                            </Popover>
                        ))}
                    </div>
                )}
            </LegendOrdinal>
            <Text
                onClick={openSeriesSelector}
                sx={smallLinkStyle}
            >
                Select different series
            </Text>
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


const legendStyle = theme => ({
    border: '1px solid ' + theme.colors.gray[3],
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

const legendItemStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3
}

const legendGlyphStyle = color => ({
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: color
})

const smallLinkStyle = theme => ({
    fontSize: '0.8em',
    color: theme.colors.gray[6],
    zIndex: 1000,
    cursor: 'pointer',
    '&:hover': {
        textDecoration: 'underline'
    }
})