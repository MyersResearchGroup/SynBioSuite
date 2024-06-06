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
    // first time visitor
    const [firstTime] = useLocalStorage({ key: 'first-time-visiting', defaultValue: true })

    // see if activity panel is open, will be used to change max width of the div below
    // doing so will prevent the content panels from being pushed around and stay centered even when the side panel is toggled off
    const isActivityPanelOpen = useSelector(state => state.activities.active)

    return (
        <div style={{ flexGrow: 1, maxWidth: !!isActivityPanelOpen ?  "calc(100vw - 318px)" : "calc(100vw - 58px)" }}>
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
