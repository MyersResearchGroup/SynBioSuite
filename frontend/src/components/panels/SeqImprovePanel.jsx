import { createContext } from 'react'
import { useSelector } from 'react-redux'
import SeqImproveFrame from './SeqImproveFrame'

export const PanelContext = createContext()

export default function SeqImprovePanel({fileObjectTypeId}) {
    const activePanel = useSelector(state => state.panels.active)
    return (
        <PanelContext.Provider value={activePanel}>
            <SeqImproveFrame/>
        </PanelContext.Provider>
    )
}