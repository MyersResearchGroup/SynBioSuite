import DragTabs from "./DragTabs"
import { useActivePanel, usePanelIds, useReorderPanels } from '../../redux/hooks/panelsHooks'
import Panel from "./Panel"
import CenteredTitle from "../CenteredTitle"
import { useLocalStorage } from "@mantine/hooks"
import WelcomeScreen from "../WelcomeScreen"
import SBOLEditorPanel from "./sbol-editor/SBOLEditorPanel"
import { Tabs as MantineTabs } from '@mantine/core';
// import { IconPhoto, IconMessageCircle, IconSettings } from '@tabler/icons-react';
import SynbioHubFrame from "./SynbioHubFrame"
import SynbioHubPanel from "./SynbioHubPanel"


export default function Panels() {

    // panel states
    const panelIds = usePanelIds()
    const [activePanel, setActivePanel] = useActivePanel()
    const reorderPanels = useReorderPanels()
    const temp = [...panelIds]
    // first time visitor
    const [firstTime] = useLocalStorage({ key: 'first-time-visiting', defaultValue: true })
   

    if(activePanel === "SynBioHub"){
        console.log("SYNBIOHUB")
        temp.push("SYNBIOHUB")
        return(
            <div style={{flexGrow: 1, overflow: "hidden"}}> 
                <DragTabs
                    tabComponent={Panel.SynBioHubTab}
                    contentComponent={
                        Panel.SBHContent
                    }
                    tabIds={temp}
                    active={activePanel}
                    onSelect={setActivePanel}
                    onReorder={reorderPanels}
                /> 
        </div> 
        )
    }
    return ( // overflow: hidden to prevent content from moving offscreen when too many tabs are open
        <div style={{flexGrow: 1, overflow: "hidden"}}> 
            {panelIds.length ?
            
                <DragTabs
                    tabComponent={Panel.Tab}
                    contentComponent={Panel.Content}
                    tabIds={temp}
                    active={activePanel}
                    onSelect={setActivePanel}
                    onReorder={reorderPanels}
                /> 
                :
                firstTime ?
                    <WelcomeScreen /> :
                    <CenteredTitle>Open a file to start</CenteredTitle>}
        </div>
    )
}
