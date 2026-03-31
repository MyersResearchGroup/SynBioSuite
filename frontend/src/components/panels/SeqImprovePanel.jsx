import { createContext } from 'react'
import { useSelector } from 'react-redux'
import SeqImproveFrame from './SeqImproveFrame'
import { panelsSlice } from '../../redux/store'

const { selectors } = panelsSlice

export const PanelContext = createContext()

export default function SeqImprovePanel({fileObjectTypeId}) {
    const activePanelId = useSelector(state => state.panels.active)
    const panel = useSelector(state => selectors.selectById(state, activePanelId))
    const url = panel?.url
    
    return (
        <PanelContext.Provider value={url}>
            <SeqImproveFrame/>
        </PanelContext.Provider>
    )
}