import { createEntityAdapter, createSlice } from "@reduxjs/toolkit"


const panelsAdapter = createEntityAdapter()
const initialState = panelsAdapter.getInitialState()

const panelsSlice = createSlice({
    name: 'panels',
    initialState,
    reducers: {
        openPanel: (state, action) => {
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