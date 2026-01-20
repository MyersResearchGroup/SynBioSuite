import { createSlice } from "@reduxjs/toolkit"
import { Activities } from "../../activities"


const initialActivities = Object.fromEntries(
    Object.values(Activities).map(act => ([ act.id, act.initialState || {} ]))
)

export const activitiesSlice = createSlice({
    name: 'activities',
    initialState: {
        states: initialActivities,
        active: Object.keys(initialActivities)[0]
    },
    reducers: {
        setActive: (state, action) => {
            state.active = action.payload
        },
    }
})


export default {
    reducer: activitiesSlice.reducer,
    actions: activitiesSlice.actions,
}