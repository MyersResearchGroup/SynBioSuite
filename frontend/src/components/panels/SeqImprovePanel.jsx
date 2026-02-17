import { createContext } from 'react'
import PanelSaver from './PanelSaver'
import { useSelector } from 'react-redux'
import SeqImproveFrame from './SeqImproveFrame'

export const PanelContext = createContext()

export default function SeqImprovePanel({fileObjectTypeId}) {
    const activePanel = useSelector(state => state.panels.active)
    return (
        <PanelContext.Provider value={activePanel}>
            <SeqImproveFrame/>
            <PanelSaver id={activePanel} />
        </PanelContext.Provider>
    )
}

const centerStyle = {
    minHeight: '50vh',
    flexDirection: 'column'
}

const tabStyles = theme => ({
    tabControl: {
        width: 120,
        textTransform: 'uppercase',
        fontWeight: 600
    },
    tabsList: {
        // backgroundColor: theme.colors.dark[6]
    }
})