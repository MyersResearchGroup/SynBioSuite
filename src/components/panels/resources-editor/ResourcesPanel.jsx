import { createContext } from 'react'
import PanelSaver from "../PanelSaver"
import { useSelector } from 'react-redux'
import ResourcesWizard from './ResourcesWizard'

//contains info that is written to json
export const PanelContext = createContext()

export default function ResourcesPanel({ id }) {
    const activePanel = useSelector(state => state.panels.active)
    return (
        <>
         <PanelContext.Provider value={activePanel}>
                <ResourcesWizard />
                <PanelSaver id={activePanel} />
            </PanelContext.Provider>
        </>
    )
}

const tabStyles = theme => ({
    tab: {
        width: 120,
        textTransform: 'uppercase',
        fontWeight: 600
    },
    tabsList: {
        // backgroundColor: theme.colors.dark[6]
    }
})