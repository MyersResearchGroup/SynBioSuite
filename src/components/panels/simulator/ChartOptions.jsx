import { Button, Popover, Slider, Switch, Text } from '@mantine/core'
import { useContext } from 'react'
import { GoSettings } from 'react-icons/go'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { PanelContext } from './SimulatorPanel'

export default function ChartOptions() {

    const panelId = useContext(PanelContext)

    const [useWhiteBackground, setUseWhiteBackground] =
        usePanelProperty(panelId, "chartOption_useWhiteBackground", false, false)

    const [truncateSpeciesNames, setTruncateSpeciesNames] =
        usePanelProperty(panelId, "chartOption_trucateSpeciesNames", false, true)

    const [showTitles, setShowTitles] =
        usePanelProperty(panelId, "chartOption_showTitles", false, false)

    const [showGrid, setShowGrid] =
        usePanelProperty(panelId, "chartOption_showGrid", false, true)

    const [showLegendWithEvery, setShowLegendWithEvery] =
        usePanelProperty(panelId, "chartOption_showLegendWithEvery", false, false)

    const [chartWidth, setChartWidth] =
        usePanelProperty(panelId, "chartOption_width", false, 100)

    const [chartHeight, setChartHeight] =
        usePanelProperty(panelId, "chartOption_height", false, 400)

    const [gapBetweenCharts, setGapBetweenCharts] =
        usePanelProperty(panelId, "chartOption_gapBetween", false, 20)

    return (

        <Popover position='bottom-end'>
            <Popover.Target>
                <Button variant='outline' leftIcon={<GoSettings />} >Chart Options</Button>
            </Popover.Target>
            <Popover.Dropdown>
                <Switch
                    label="Use white background"
                    checked={useWhiteBackground}
                    onChange={event => setUseWhiteBackground(event.currentTarget.checked)}
                    mb={10}
                />

                <Switch
                    label="Show chart titles"
                    checked={showTitles}
                    onChange={event => setShowTitles(event.currentTarget.checked)}
                    mb={10}
                />

                <Switch
                    label="Show grid"
                    checked={showGrid}
                    onChange={event => setShowGrid(event.currentTarget.checked)}
                    mb={10}
                />

                <Switch
                    label="Truncate species names"
                    checked={truncateSpeciesNames}
                    onChange={event => setTruncateSpeciesNames(event.currentTarget.checked)}
                    mb={10}
                />

                <Switch
                    label="Show legend with every chart"
                    checked={showLegendWithEvery}
                    onChange={event => setShowLegendWithEvery(event.currentTarget.checked)}
                    mb={10}
                />

                <Text size='sm' mb={6}>Chart width</Text>
                <Slider
                    value={chartWidth}
                    onChange={setChartWidth}
                    marks={[
                        { value: 25, label: '' },
                        { value: 50, label: '' },
                        { value: 75, label: '' },
                    ]}
                    label={label => label + '%'}
                    labelAlwaysOn={true}
                    min={0}
                    max={100}
                    step={5}
                    styles={sliderStyles}
                    mb={40}
                />

                <Text size='sm' mb={6}>Chart height</Text>
                <Slider
                    value={chartHeight}
                    onChange={setChartHeight}
                    marks={[
                        { value: 200, label: '' },
                        { value: 400, label: '' },
                        { value: 600, label: '' },
                    ]}
                    labelAlwaysOn={true}
                    min={0}
                    max={800}
                    step={25}
                    styles={sliderStyles}
                    mb={40}
                />

                <Text size='sm' mb={6}>Gap between charts</Text>
                <Slider
                    value={gapBetweenCharts}
                    onChange={setGapBetweenCharts}
                    marks={[
                        { value: 10, label: '' },
                        { value: 20, label: '' },
                        { value: 30, label: '' },
                    ]}
                    label={label => label + '%'}
                    labelAlwaysOn={true}
                    min={0}
                    max={40}
                    step={5}
                    styles={sliderStyles}
                    mb={40}
                />
            </Popover.Dropdown>
        </Popover>
    )
}


const sliderStyles = theme => ({
    label: {
        transform: "translateY(54px)"
    }
})
