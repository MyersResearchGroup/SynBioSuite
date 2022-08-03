import { useDebouncedValue } from "@mantine/hooks"
import { showNotification } from "@mantine/notifications"
import { createEntityAdapter, createSelector, createSlice } from "@reduxjs/toolkit"
import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { getPanelType, getPanelTypeForObject } from "../../panels"

// Create slice and adapter

const panelsAdapter = createEntityAdapter()
const initialState = panelsAdapter.getInitialState()

export const panelsSlice = createSlice({
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

const actions = panelsSlice.actions
const selectors = panelsAdapter.getSelectors(state => state.panels)


// Selector hooks

export const usePanelIds = () => useSelector(panelsSelectors.selectIds)
export const usePanel = id => useSelector(state => selectors.selectById(state, id))

export const usePanelProperty = (id, property, readonly = true, defaultValue) => {
    const value = useSelector(state => selectors.selectById(state, id)[property])

    // if readonly, just send back value
    if (readonly)
        return value

    // function for setting new value
    const dispatch = useDispatch()
    const setValue = newValue => dispatch(actions.updateOne({
        id,
        changes: {
            [property]:
                typeof newValue == 'function' ? newValue(value) : newValue
        }
    }))

    // if default value is provided and no value exists in the store,
    // dispatch default
    defaultValue != null && useEffect(() => {
        value === undefined && setValue(defaultValue)
    }, [])


    return [value, setValue]
}

export const usePanelType = id => useSelector(
    createSelector(
        state => selectors.selectById(state, id).type,
        type => getPanelType(type)
    )
)


// Action hooks

export function useOpenPanel() {
    const dispatch = useDispatch()
    return async fileHandle => {

        const panelTypeDef = getPanelTypeForObject(fileHandle.objectType)

        // show error notification if there's no panel type
        if (!panelTypeDef) {
            showNotification({
                message: `There is no editor associated with this file type.`,
                color: "red"
            })
            return
        }

        // read in file content
        const fileContent = await (await fileHandle.getFile()).text()
        const savedProperties = panelTypeDef?.deserialize?.(fileContent) || {}

        // dispatch open action
        dispatch(actions.openPanel({
            ...savedProperties,
            id: fileHandle.id,
            type: panelTypeDef.id,
            fileHandle,
        }))
    }
}

export function useClosePanel() {
    const dispatch = useDispatch()
    return panelId => dispatch(actions.closePanel(panelId))
}

export function useCloseAllPanels() {
    const dispatch = useDispatch()
    return () => dispatch(actions.closeAll())
}

export function useActivePanel() {
    const dispatch = useDispatch()
    return [
        useSelector(state => state.panels.active),
        panelId => dispatch(actions.setActive(panelId))
    ]
}

export function useMarkPanelUnsavedEffect(id, dependencies) {
    const dispatch = useDispatch()

    useEffect(() => {
        dispatch(actions.updateOne({
            id,
            changes: { saved: false }
        }))
    }, dependencies)
}

export function useReorderPanels() {
    const dispatch = useDispatch()
    return payload => dispatch(actions.reoder(payload))
}

// Exports

export default panelsSlice.reducer
export const panelsActions = actions
export const panelsSelectors = selectors