import { createSlice } from "@reduxjs/toolkit"
import { useSelector, useDispatch } from 'react-redux'
import { Activities } from "../../activities"


const initialActivities = Object.fromEntries(
    Object.values(Activities).map(act => ([ act.id, act.initialState || {} ]))
)

// create slice
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

// export actions & reducer
export const activityActions = activitiesSlice.actions
export default activitiesSlice.reducer


// custom hooks for selectors

export function useActivityStates() {
    return [
        /* activities */ useSelector(state => state.activities.states)
    ]
}

export function useActiveActivity() {

    const dispatch = useDispatch()

    return [
        /* activeActivity */ useSelector(state => state.activities.active),
        /* setActiveActivity */ newActive => dispatch(activityActions.setActive(newActive))
    ]
}