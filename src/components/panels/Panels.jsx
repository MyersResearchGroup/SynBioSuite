import DragTabs from "./DragTabs"
import { useActivePanel, usePanelIds, useReorderPanels } from '../../redux/hooks/panelsHooks'
import Panel from "./Panel"
import CenteredTitle from "../CenteredTitle"
import { useLocalStorage } from "@mantine/hooks"
import WelcomeScreen from "../WelcomeScreen"

export default function Panels() {

    // panel states
    const panelIds = usePanelIds()
    const [activePanel, setActivePanel] = useActivePanel()
    const reorderPanels = useReorderPanels()
    
    // first time visitor
    const [firstTime] = useLocalStorage({ key: 'first-time-visiting', defaultValue: true })
   
    return ( // width: 0 prevents content from overflowing when too many tabs are open
        <div style={{flexGrow: 1, width: 0}}> 
            {panelIds.length ?
                <DragTabs
                    tabComponent={Panel.Tab}
                    contentComponent={Panel.Content}
                    tabIds={panelIds}
                    active={activePanel}
                    onSelect={setActivePanel}
                    onReorder={reorderPanels}
                /> :
                firstTime ?
                    <WelcomeScreen /> :
                    <CenteredTitle>Open a file to start</CenteredTitle>}
        </div>
    )
}
