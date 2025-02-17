import DragTabs from "./DragTabs"
import { useActivePanel, usePanelIds, useReorderPanels } from '../../redux/hooks/panelsHooks'
import { useActiveActivity, useActivities } from '../../redux/hooks/activityHooks'
import Panel from "./Panel"
import CenteredTitle from "../CenteredTitle"
import { useLocalStorage } from "@mantine/hooks"
import WelcomeScreen from "../WelcomeScreen"
import LoginStatus from "../LoginStatus"
import { InstanceProvider } from "../../context/InstanceContext"

export default function Panels() {

    // panel states
    const panelIds = usePanelIds()
    const [activePanel, setActivePanel] = useActivePanel()
    const reorderPanels = useReorderPanels()
    const [activeActivity, setActiveActivity] = useActiveActivity()
    
    // first time visitor
    const [firstTime] = useLocalStorage({ key: 'first-time-visiting', defaultValue: true })
   
    return ( // overflow: hidden to prevent content from moving offscreen when too many tabs are open
        <div style={{flexGrow: 1, overflow: "hidden"}}> 
            {activeActivity != "synbio.activity.login-status-panel" ? panelIds.length ?
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
                    <CenteredTitle>Open a file to start</CenteredTitle>:
                    <InstanceProvider><LoginStatus>Open a file to start</LoginStatus></InstanceProvider>}
        </div>
    )
}
