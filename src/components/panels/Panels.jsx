import DragTabs from "./DragTabs"
import { useActivePanel, useClosePanel, useOpenPanel, usePanels, useReorderPanels, useSaveActivePanel } from '../../redux/slices/panelSlice'
import { titleFromFileName } from "../../redux/slices/workingDirectorySlice"
import { getPanelType } from "../../panels"
import { useEffect, useRef } from "react"

export default function Panels() {

    // panel states -- from store
    const panels = usePanels()
    const [activePanel, setActivePanel] = useActivePanel()
    const closePanel = useClosePanel()
    const reoderPanels = useReorderPanels()

    // create tabs
    const tabs = panels.map(panel => {
        const panelTypeDef = getPanelType(panel.type)
        return {
            title: titleFromFileName(panel.fileHandle.name) + (panel.saved ? '' : '*'),
            icon: panelTypeDef.icon && <panelTypeDef.icon />,
            content: <panelTypeDef.component id={panel.id} />,
        }
    })

    // find active tab index
    const activeTabIndex = panels.findIndex(panel => panel.id == activePanel)

    // handle tab change
    const handleTabChange = index => setActivePanel(panels[index].id)

    // handle tab close
    const handleClose = index => closePanel(panels[index].id)

    // handle saving
    const saveActivePanel = useRef()
    saveActivePanel.current = useSaveActivePanel()
    const ctrlSHandler = event => {
        if (event.ctrlKey && event.code === 'KeyS') {
            console.debug("Saving active panel")
            event.preventDefault()
            saveActivePanel.current()
        }
    }

    // add Ctrl+S listener on mount
    useEffect(() => {
        window.addEventListener("keydown", ctrlSHandler)
        return () => window.removeEventListener("keydown", ctrlSHandler)
    }, [])

    return (
        <div style={{ flexGrow: 1 }}>
            <DragTabs
                tabs={tabs}
                active={activeTabIndex}
                onSelect={handleTabChange}
                onClose={handleClose}
                onReorder={reoderPanels}
            />
        </div>
    )
}





const tabStyles = theme => {
    const dark = theme.colorScheme == 'dark'
    const activeColor = dark ? theme.colors.gray[3] : theme.colors.dark[8]

    return {

    }
}
