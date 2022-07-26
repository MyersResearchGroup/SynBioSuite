import { useState } from 'react'
import { Center, Checkbox, ColorPicker, Modal, Popover, SimpleGrid, Stack, Text, Title, useMantineTheme } from '@mantine/core'
import { XYChart, Axis, LineSeries, Tooltip, Grid, buildChartTheme } from '@visx/xychart'
import { LegendItem, LegendLabel, LegendOrdinal } from '@visx/legend'
import { scaleOrdinal } from '@visx/scale'
import { useListState } from '@mantine/hooks'

const accessors = {
    xAccessor: d => d[0],
    yAccessor: series => d => d[series],
}


export default function LineChart({ data, labels, showSeries, title }) {

    // Stylistic and theme stuff
    const mantineTheme = useMantineTheme()
    const lineColors = Object.values(mantineTheme.colors).map(colorSeries => colorSeries[4])
    const chartTheme = buildChartTheme({
        // colors
        // backgroundColor: string // used by Tooltip, Annotation
        // colors: Object.values(mantineTheme.colors).map(colorSeries => colorSeries[5]),

        // labels
        // svgLabelBig?: SVGTextProps
        // svgLabelSmall?: SVGTextProps
        // htmlLabel?: HTMLTextStyles

        // lines
        // xAxisLineStyles?: LineStyles
        // yAxisLineStyles?: LineStyles
        // xTickLineStyles?: LineStyles
        // yTickLineStyles?: LineStyles
        // tickLength: number

        // grid
        gridColor: mantineTheme.colors.gray[8],
        // gridColorDark: string // used for axis baseline if x/yxAxisLineStyles not set
        // gridStyles?: CSSProperties
    })

    // Series selection states
    const [series, seriesHandlers] = useListState(labels.map((label, i) => ({
        dataIndex: i,
        key: label,
        show: showSeries.includes(i),
        stroke: randomFromSet(lineColors)
    })))
    const [seriesSelectorOpened, setSeriesSelectorOpened] = useState(false)

    // Color picker states
    const [colorPickersOpened, colorPickersOpenedHandlers] = useListState()

    // Create legend
    const seriesShowing = series.filter(s => s.show)
    const legendScale = scaleOrdinal({
        domain: seriesShowing.map(s => s.key),
        range: seriesShowing.map(s => s.stroke),
    })


    return (
        <>
            <Stack align="center" justify="flex-start" >
                {title && <Title order={3} align='center' sx={titleStyle}>{title}</Title>}
                <XYChart
                    theme={chartTheme}
                    // width={600}
                    height={400}
                    xScale={{ type: 'linear' }}
                    yScale={{ type: 'linear' }}
                    style={{ width: '100%' }}
                // !! Might use this for zooming in on graph
                // captureEvents={!editAnnotationLabelPosition}
                // onPointerUp={(d) => {
                //     setAnnotationDataKey(d.key as 'New York' | 'San Francisco' | 'Austin')
                //     setAnnotationDataIndex(d.index)
                // }}
                >
                    <Grid
                        rows
                        columns
                        numTicks={10}
                    />
                    {
                        seriesShowing.map(s => (
                            <LineSeries
                                key={s.key}
                                dataKey={s.key}
                                data={data}
                                xAccessor={accessors.xAccessor}
                                yAccessor={accessors.yAccessor(s.dataIndex)}
                                stroke={s.stroke}
                            />
                        ))
                    }

                    <Axis
                        orientation='left'
                        numTicks={5}
                    // label='Concentration'
                    />
                    <Axis
                        label='Time'
                        orientation='bottom'
                        numTicks={10}
                    />
                    <Tooltip
                        showVerticalCrosshair
                        snapTooltipToDatumX
                        snapTooltipToDatumY
                        renderTooltip={renderTooltip(series)}
                        renderGlyph={renderTooltipGlyph(series)}
                        showDatumGlyph
                        showSeriesGlyphs
                    />
                </XYChart>
                <Stack align='center'>
                    <LegendOrdinal scale={legendScale} >
                        {chartLabels => (
                            <div style={legendStyle(mantineTheme)}>
                                {chartLabels.map((chartLabel, i) => (
                                    <Popover
                                        key={`legend-${i}`}
                                        opened={colorPickersOpened.includes(chartLabel.text)}
                                        onClose={() => colorPickersOpenedHandlers.remove(colorPickersOpened.indexOf(chartLabel.text))}
                                        target={
                                            <LegendItem
                                                style={legendItemStyle}
                                                onClick={() => colorPickersOpenedHandlers.append(chartLabel.text)}
                                            >
                                                <div style={legendGlyphStyle(chartLabel.value)}></div>
                                                <LegendLabel align="left" margin="0 0 0 4px">
                                                    {chartLabel.text}
                                                </LegendLabel>
                                            </LegendItem>
                                        }
                                        width={260}
                                        position="bottom"
                                    >
                                        <ColorPicker
                                            value={chartLabel.value}
                                            onChange={newColor => seriesHandlers.setItemProp(series.findIndex(s => s.key == chartLabel.text), 'stroke', newColor)}
                                        />
                                    </Popover>
                                ))}
                            </div>
                        )}
                    </LegendOrdinal>
                    <Text
                        onClick={() => setSeriesSelectorOpened(true)}
                        sx={smallLinkStyle}
                    >
                        Select different series
                    </Text>
                </Stack>
            </Stack>
            <Modal
                size='xl'
                opened={seriesSelectorOpened}
                onClose={() => setSeriesSelectorOpened(false)}
                title="Select series"
            >
                <SimpleGrid cols={3}>
                    {series.map((s, i) => (
                        <Checkbox
                            key={s.key}
                            label={s.key}
                            checked={s.show}
                            styles={checkboxStyles(s.stroke)}
                            onChange={event => seriesHandlers.setItemProp(i, 'show', event.currentTarget.checked)}
                        />
                    ))}
                </SimpleGrid>
            </Modal>
        </>
    )
}


const titleStyle = theme => ({
    marginBottom: -20,
    fontSize: 18,
    fontWeight: 600
})

const smallLinkStyle = theme => ({
    fontSize: '0.8em',
    color: theme.colors.gray[6],
    cursor: 'pointer',
    '&:hover': {
        textDecoration: 'underline'
    }
})

const legendStyle = theme => ({
    border: '1px solid ' + theme.colors.gray[3],
    display: 'inline-flex',
    flexWrap: 'wrap',
    maxWidth: '100%',
    padding: 8,
    borderRadius: 4
})

const legendItemStyle = {
    margin: '0 8px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center'
}

const legendGlyphStyle = color => ({
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: color
})

const checkboxStyles = color => theme => ({
    input: {
        '&:checked': {
            /*
                omitting this for now because not being able to change
                the color inside the selector may be confusing
            */
            // backgroundColor: color,
            // borderColor: color
        }
    }
})

const renderTooltip = series => ({ tooltipData }) => {

    const tooltipRow = (key, val, color, bold) => (
        <div key={key} style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: color || 'black',
            fontWeight: bold ? 'bold' : 'normal'
        }}>
            <span>{key}</span>
            <span style={{ marginLeft: 16 }}>{val}</span>
        </div>
    )

    return <>
        {tooltipRow('Time', accessors.xAccessor(tooltipData.nearestDatum.datum))}
        <br />
        {
            Object.entries(tooltipData.datumByKey).map(([key, val]) => {

                const currentSeries = series.find(s => s.key == key)

                return tooltipRow(
                    key,
                    val.datum[currentSeries.dataIndex].toFixed(2),
                    currentSeries.stroke,
                    tooltipData.nearestDatum.key == key
                )
            })
        }
    </>
}

const renderTooltipGlyph = series => point => {
    const currentSeries = series.find(s => s.key == point.key)
    const size = 10

    return <svg width={size} height={size} style={{
        transform: `translate(-${size / 2}px, -${size / 2}px)`
    }}>
        <circle fill={currentSeries.stroke} r={size / 2} cx={size / 2} cy={size / 2} />
    </svg>
}

function randomColorsFromSet(set, numColors) {
    const randoms = []
    while (randoms.length < numColors) {
        const rand = Math.floor(Math.random() * set.length)
        !randoms.includes(rand) && randoms.push(rand)
    }
    return randoms.map(i => set[i])
}

function randomFromSet(set) {
    return set[Math.floor(Math.random() * set.length)]
}