import { createContext } from 'react'
import { useSelector } from 'react-redux'
import SeqImproveFrame from './SeqImproveFrame'
import PanelSaver from './PanelSaver'
import { panelsSlice } from '../../redux/store'

const { selectors } = panelsSlice

export const PanelContext = createContext()

export default function SeqImprovePanel({ id, fileObjectTypeId }) {
    const panel = useSelector(state => selectors.selectById(state, id))
    const url = panel?.url

    return (
        <PanelContext.Provider value={{ url, panelId: id }}>
            <SeqImproveFrame fileTypeObjectId={fileObjectTypeId} />
            <PanelSaver id={id} />
        </PanelContext.Provider>
    )
}
