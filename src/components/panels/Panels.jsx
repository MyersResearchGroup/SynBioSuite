import DragTabs from "./DragTabs"
import { useActivePanel, usePanelIds, useReorderPanels } from '../../redux/hooks/panelsHooks'
import Panel from "./Panel"
import CenteredTitle from "../CenteredTitle"
import { useLocalStorage } from "@mantine/hooks"
import WelcomeScreen from "../WelcomeScreen"
import SBOLEditorPanel from "./sbol-editor/SBOLEditorPanel"
import { Tabs } from '@mantine/core';
// import { IconPhoto, IconMessageCircle, IconSettings } from '@tabler/icons-react';
import SynbioHubFrame from "./SynbioHubFrame"


export default function Panels() {

    // panel states
    const panelIds = usePanelIds()
    const [activePanel, setActivePanel] = useActivePanel()
    const reorderPanels = useReorderPanels()
    
    // first time visitor
    const [firstTime] = useLocalStorage({ key: 'first-time-visiting', defaultValue: true })
   
    return ( // overflow: hidden to prevent content from moving offscreen when too many tabs are open
        <div style={{flexGrow: 1, overflow: "hidden"}}> 
            {panelIds.length ?
            // <Tabs defaultValue="gallery">
            //     <Tabs.List>
            //     <Tabs.Tab value="gallery">
            //         Gallery
            //     </Tabs.Tab>
            //     <Tabs.Tab value="messages">
            //         Messages
            //     </Tabs.Tab>
            //     <Tabs.Tab value="settings">
            //         Settings
            //     </Tabs.Tab>
            //     </Tabs.List>

            //     <Tabs.Panel value="gallery">
            //         <iframe src="https://sbolcanvas.org" width="100%" height="400" />
            //     </Tabs.Panel>

            //     <Tabs.Panel value="messages">
            //     Messages tab content
            //     </Tabs.Panel>

            //     <Tabs.Panel value="settings">
            //     Settings tab content
            //     </Tabs.Panel>
            //     </Tabs>
                <DragTabs
                    tabComponent={Panel.Tab}
                    contentComponent={Panel.Content}
                    tabIds={panelIds}
                    active={activePanel}
                    onSelect={setActivePanel}
                    onReorder={reorderPanels}
                /> 
                :
                firstTime ?
                    <WelcomeScreen /> :
                    <SynbioHubFrame/>}

        </div>
    )
}
