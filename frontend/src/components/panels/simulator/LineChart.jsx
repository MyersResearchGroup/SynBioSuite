import { useState } from 'react'
import { Stack, Title, useMantineTheme } from '@mantine/core'
import { XYChart, Axis, LineSeries, Tooltip, darkTheme, lightTheme, Grid } from '@visx/xychart'
import { randomId, useTimeout } from '@mantine/hooks'
import { GlyphCircle } from '@visx/glyph'
import { useEffect } from 'react'
import { useContext } from 'react'
import { PanelContext } from './SimulatorPanel'
import { truncateSpeciesNames } from './ChartLegend'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { useMemo } from 'react'

const MAX_POINTS = 500

const accessors = {
    xAccessor: d => d?.[0],
    yAccessor: series => d => d?.[series],
}


export default function LineChart({ data, title, series, height, mt, yDomain }) {

    const panelId = useContext(PanelContext)

    // use Mantine theme
    const mantineTheme = useMantineTheme()

    // grab chart options
    const chartOptions = {
        truncateSpeciesNames:
            usePanelProperty(panelId, "chartOption_trucateSpeciesNames"),
        showGrid:
            usePanelProperty(panelId, "chartOption_showGrid"),
        useWhiteBackground:
            usePanelProperty(panelId, "chartOption_useWhiteBackground"),
    }

    // adjust themes
    modifyThemes(mantineTheme)

    // force update to rerender plot after debounced resize
    const [forcedUpdateKey, setForcedUpdateKey] = useState('chart')
    const resizeTimeout = useTimeout(() => {
        setForcedUpdateKey(randomId())
    }, 200)
    useEffect(() => {
        const onResize = () => {
            resizeTimeout.clear()
            resizeTimeout.start()
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    // only show max of 1000 points
    const truncatedData = useMemo(() => data.filter((_, i) =>
        Math.floor(i % (data.length / MAX_POINTS)) == 0
    ), [data])

    return (
        <Stack align="center" justify="flex-start" mt={mt} >
            {title && <Title order={3} align='center' sx={titleStyle(chartOptions.useWhiteBackground)}>{title}</Title>}
            <XYChart
                key={forcedUpdateKey} // forces rerender in combination with forceUpdate (above)
                theme={chartOptions.useWhiteBackground ? lightTheme : darkTheme}
                height={height}
                xScale={{ type: 'linear' }}
                yScale={{ type: 'linear', ...(yDomain && { domain: yDomain }) }}
                style={{ width: '100%' }}
            >
                {chartOptions.showGrid &&
                    <Grid
                        rows
                        columns
                        numTicks={Math.floor(height / 200) * 5}
                    />}
                {
                    series.map(s => (
                        <LineSeries
                            key={s.key}
                            dataKey={s.key}
                            // data={data}
                            data={truncatedData}
                            xAccessor={accessors.xAccessor}
                            yAccessor={accessors.yAccessor(s.dataIndex)}
                            stroke={s.stroke}
                            strokeWidth={s.bold ? 3 : 1}
                        />
                    ))
                }

                <Axis
                    orientation='left'
                    numTicks={Math.max(Math.floor(height / 200) * 5, 1)}
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
                    renderTooltip={renderTooltip(series, chartOptions.truncateSpeciesNames, chartOptions.useWhiteBackground)}
                    renderGlyph={renderTooltipGlyph(series)}
                    showDatumGlyph
                    showSeriesGlyphs
                />
            </XYChart>
        </Stack>
    )
}


const titleStyle = whiteBg => theme => ({
    marginTop: 60,
    marginBottom: -60,
    fontSize: 18,
    fontWeight: 600,
    ...(whiteBg && { color: theme.colors.dark[5] })
})


const renderTooltip = (series, truncate, whiteBg) => ({ tooltipData }) => {

    const tooltipRow = (key, val, color, bold) => (
        <div key={key} style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: color || (whiteBg ? 'black' : 'white'),
            fontWeight: bold ? 'bold' : 'normal'
        }}>
            <span>{truncate ? truncateSpeciesNames(key) : key}</span>
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
    const size = 100

    return <GlyphCircle
        size={size / 2}
        fill={currentSeries.stroke}
    />
}

function modifyThemes(mantineTheme) {

    // modify dark theme
    darkTheme.gridStyles = {
        stroke: mantineTheme.colors.dark[5],
        strokeWidth: 1
    }

    // modify light theme

    // grid
    lightTheme.gridStyles = {
        stroke: mantineTheme.colors.gray[1],
        strokeWidth: 1
    }

    // axis lines and ticks
    lightTheme.axisStyles.x.bottom.axisLine =
        lightTheme.axisStyles.x.bottom.tickLine =
        lightTheme.axisStyles.y.left.axisLine =
        lightTheme.axisStyles.y.left.tickLine =
        {
            stroke: mantineTheme.colors.dark[4],
            strokeWidth: 1
        }

    // tick labels
    const tickLabelStyles = {
        fill: mantineTheme.colors.dark[6],
        fontWeight: 500,
    }
    lightTheme.axisStyles.x.bottom.tickLabel = {
        ...lightTheme.axisStyles.x.bottom.tickLabel,
        ...tickLabelStyles
    }
    lightTheme.axisStyles.y.left.tickLabel = {
        ...lightTheme.axisStyles.y.left.tickLabel,
        ...tickLabelStyles
    }
}