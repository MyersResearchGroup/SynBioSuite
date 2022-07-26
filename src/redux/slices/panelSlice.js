import { createSlice } from "@reduxjs/toolkit"
import { useSelector, useDispatch } from 'react-redux'
import { getPanelTypeForObject } from "../../panels"
import { showNotification } from '@mantine/notifications'
import { v4 as uuidv4 } from 'uuid'
import { useEffect } from "react"


// create slice
export const panelSlice = createSlice({
    name: 'panels',
    initialState: {
        open: [],
        active: null
    },
    reducers: {
        // open panel of type
        openPanel: (state, action) => {
            const { select = true, ...newPanel } = action.payload

            state.open.push({
                ...newPanel,
                state: {}
            })
            select && (state.active = newPanel.id)

            console.debug("Opened panel:", newPanel.id)
        },
        // close panel by id
        closePanel: (state, action) => {
            state.open.splice(
                state.open.findIndex(panel => panel.id == action.payload),
                1
            )
            console.debug("Closed panel:", action.payload)
        },
        reorderPanels: (state, action) => {
            const { from, to, select } = action.payload
            state.open.splice(
                to, 0, state.open.splice(from, 1)[0]
            )
            select && (state.active = state.open[to].id)
            console.debug("Reordered panels")
        },
        setActive: (state, action) => {
            state.active = action.payload
            console.debug("Changed active panel:", action.payload)
        },
        reset: (state, action) => {
            state.open = []
            state.active = null
        },
        setPanelState: (state, action) => {
            const { target, newState, stateKey } = action.payload
            const panel = state.open.find(p => p.id == target)
            stateKey ?
                (panel.state[stateKey] = newState) :
                (panel.state = newState)
        },
        setPanelSaved: (state, action) => {
            const { target, saved } = action.payload
            const panel = state.open.find(p => p.id == target)
            panel.saved = saved
        }
    }
})

// export actions & reducer
const actions = panelSlice.actions
export const panelSliceActions = actions
export default panelSlice.reducer


// custom hooks for selectors

export function usePanels() {
    return /* panels */ useSelector(state => state.panels.open)
}

export function useOpenPanel() {
    const dispatch = useDispatch()
    const panels = usePanels()

    return newPanel => {
        const type = getPanelTypeForObject(newPanel.fileHandle.objectType)?.id

        // dispatch notification if type doesn't exist
        if (!type) {
            showNotification({
                message: "There is no editor associated with this file type.",
                color: "red"
            })
            return
        }

        // if panel is already open, switch to it; otherwise, open panel
        const existingPanel = panels.find(panel => panel.fileHandle == newPanel.fileHandle)
        existingPanel ?
            dispatch(actions.setActive(existingPanel.id)) :
            dispatch(actions.openPanel({
                ...newPanel,
                id: uuidv4(),
                type
            }))
    }
}

export function useClosePanel() {
    const dispatch = useDispatch()
    return panelId => dispatch(actions.closePanel(panelId))
}

export function useReorderPanels() {
    const dispatch = useDispatch()
    return payload => dispatch(actions.reorderPanels(payload))
}

export function useActivePanel() {
    const dispatch = useDispatch()
    return [
        /* activePanel */ useSelector(state => state.panels.active),
        /* setActivePanel */ newActive => dispatch(actions.setActive(newActive))
    ]
}

export function useResetPanels() {
    const dispatch = useDispatch()
    return () => dispatch(actions.reset())
}

export function usePanel(id) {
    const dispatch = useDispatch()
    const panel = useSelector(state => state.panels.open.find(panel => panel.id == id))
    return [
        /* panel */ panel,
        /* usePanelState */ (stateKey, initialState) => {

            // set initial state
            useEffect(() => {
                !panel.state.hasOwnProperty(stateKey) &&
                    dispatch(actions.setPanelState({
                        target: id,
                        stateKey,
                        newState: initialState
                    }))
            }, [])

            const currentState = useSelector(
                state => state.panels.open.find(p => p.id == panel.id).state[stateKey]
            )

            // return pattern matching useState shape
            return [
                currentState,
                newState => dispatch(actions.setPanelState({
                    target: id,
                    stateKey,
                    newState: typeof newState == 'function' ?
                        newState(currentState) : 
                        newState
                }))
            ]
        },
        /* setPanelState */ newState => dispatch(actions.setPanelState({
            target: id,
            newState
        })),
    ]
}

export function useSavePanel(id) {
    const dispatch = useDispatch()
    const panel = useSelector(state => state.panels.open.find(panel => panel.id == id))

    const save = async () => {
        const writableStream = await panel.fileHandle.createWritable()
        await writableStream.write(JSON.stringify(panel.state))
        await writableStream.close()
    }

    return [
        /* saved */  panel.saved,
        /* save */  save,
    ]
}