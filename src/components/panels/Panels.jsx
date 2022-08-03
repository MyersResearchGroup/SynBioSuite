import DragTabs from "./DragTabs"
import { useActivePanel, usePanelIds, useReorderPanels } from '../../redux/slices/panelsSlice'
import Panel from "./Panel"

export default function Panels() {

    // panel states
    const panelIds = usePanelIds()
    const [activePanel, setActivePanel] = useActivePanel()
    const reorderPanels = useReorderPanels()

    return (
        <div style={{ flexGrow: 1 }}>
            <DragTabs
                tabComponent={Panel.Tab}
                contentComponent={Panel.Content}
                tabIds={panelIds}
                active={activePanel}
                onSelect={setActivePanel}
                onReorder={reorderPanels}
            />
        </div>
    )
}
