import { createEntityAdapter, createSlice } from "@reduxjs/toolkit"

const SEQ_IMPROVE_PANEL_TYPE = "synbio.panel-type.seqimprove"

const panelsAdapter = createEntityAdapter()
const initialState = panelsAdapter.getInitialState()

const panelsSlice = createSlice({
    name: 'panels',
    initialState,
    reducers: {
        openPanel: (state, action) => {
            // Keep SeqImprove as a singleton panel and reactivate it if it already exists.
            if (action.payload?.type === SEQ_IMPROVE_PANEL_TYPE) {
                const existingSeqImprovePanelId = state.ids.find(id => state.entities[id]?.type === SEQ_IMPROVE_PANEL_TYPE)

                if (existingSeqImprovePanelId) {
                    const existingPanel = state.entities[existingSeqImprovePanelId]
                    existingPanel.url = action.payload.url ?? existingPanel.url
                    existingPanel.name = action.payload.name ?? existingPanel.name
                    state.active = existingSeqImprovePanelId
                    return
                }
            }

            panelsAdapter.addOne(state, action.payload)
            state.active = action.payload.id
        },
        closePanel: (state, action) => {
            panelsAdapter.removeOne(state, action.payload)
            if (state.active == action.payload)
                state.active = state.ids[0]
        },
        setActive: (state, action) => {
            state.active = action.payload
        },
        closeAll: panelsAdapter.removeAll,
        updateOne: panelsAdapter.updateOne,
        reoder: (state, action) => {
            const { from, to } = action.payload
            state.ids.splice(
                to, 0, state.ids.splice(from, 1)[0]
            )
        }
    }
})


export default {
    reducer: panelsSlice.reducer,
    actions: panelsSlice.actions,
    selectors: panelsAdapter.getSelectors(state => state.panels),
}