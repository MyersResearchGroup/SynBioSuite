
import { useActivePanel, usePanelIds, useReorderPanels } from '../../redux/hooks/panelsHooks'
import { useLocalStorage } from "@mantine/hooks"
import DragTabs from '../panels/DragTabs'
import MicrosoftWelcome from './MicrosoftWelcome'
import Panel from '../panels/Panel'
import CenteredTitle from '../CenteredTitle'
import { useSelector } from 'react-redux'

export default function MicrosoftPanels() {
    // panel states
    const panelIds = usePanelIds()
    const [activePanel, setActivePanel] = useActivePanel()
    const reorderPanels = useReorderPanels()
    const hasSeqImprovePanel = useSelector(state =>
        Object.values(state.panels.entities || {}).some(panel => panel?.type === "synbio.panel-type.seqimprove")
    )
    // first time visitor
    const [firstTime] = useLocalStorage({ key: 'first-time-visiting', defaultValue: true })
   
    return ( // overflow: hidden to prevent content from moving offscreen when too many tabs are open
        <div style={{flexGrow: 1, overflow: "hidden"}}> 
            {panelIds.length ?
            
                <DragTabs
                    tabComponent={Panel.Tab}
                    contentComponent={Panel.Content}
                    tabIds={panelIds}
                    active={activePanel}
                    onSelect={setActivePanel}
                    onReorder={reorderPanels}
                    keepMounted={hasSeqImprovePanel}
                /> 
                :
                firstTime ?
                    <MicrosoftWelcome /> :
                    <CenteredTitle>Open a file to start</CenteredTitle>}
        </div>
    )
}