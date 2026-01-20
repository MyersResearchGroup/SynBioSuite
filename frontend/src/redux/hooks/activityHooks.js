import { useSelector, useDispatch } from 'react-redux'
import { activitySlice } from '../store'

const { actions } = activitySlice


// Selector hooks

export function useActivities() {
    return /* activities */ useSelector(state => state.activities.states)
}

export function useActiveActivity() {

    const dispatch = useDispatch()

    return [
        /* activeActivity */ useSelector(state => state.activities.active),
        /* setActiveActivity */ newActive => dispatch(actions.setActive(newActive))
    ]
}

// Other exports

export {
    actions as activityActions
}