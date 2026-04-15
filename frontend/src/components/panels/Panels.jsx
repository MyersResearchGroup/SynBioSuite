import DragTabs from "./DragTabs"
import { useActivePanel, usePanelIds, useReorderPanels } from '../../redux/hooks/panelsHooks'
import Panel from "./Panel"
import CenteredTitle from "../CenteredTitle"
import { useLocalStorage } from "@mantine/hooks"
import WelcomeScreen from "../WelcomeScreen"
import { useSelector } from "react-redux"

export default function Panels() {
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
                    <WelcomeScreen /> :
                    <CenteredTitle>Open a file to start</CenteredTitle>}
        </div>
    )
}
