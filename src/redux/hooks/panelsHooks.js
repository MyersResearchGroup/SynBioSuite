import store, { panelsSlice } from "../store"
import commands from "../../commands"
import { useDebouncedValue } from "@mantine/hooks"
import { showNotification } from "@mantine/notifications"
import { createSelector } from "@reduxjs/toolkit"
import { useEffect, useMemo, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import { getPanelType, getPanelTypeForObject } from "../../panels"
import { setIsSaving } from "../slices/saveIndicatorSlice"
const { actions, selectors } = panelsSlice


// Selector hooks

export const usePanelIds = () => useSelector(selectors.selectIds)
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
    return (panelId, save = true) => {
        save && commands.FileSave.execute(panelId)  // save
        dispatch(actions.closePanel(panelId))       // close
    }
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

export function useAutoSavePanel(id, debounceTime) {
    const panel = usePanel(id)
    useSelector(state => state.saveIndicator)
    const dispatch = useDispatch()

    // memoize serialization of panel
    const serialized = useMemo(() => serializePanel(id), [panel])

    // create a ref for serialized so we can always access current version
    // of it
    const serializedRef = useRef()
    serializedRef.current = serialized

    // debounce serialized content
    const [debouncedPanelContent] = useDebouncedValue(serialized, debounceTime)

    // save when debounced serialized content changes
    useEffect(() => {
        const save = async() =>{
            dispatch(setIsSaving(true))
            await commands.FileSave.execute(id) // saving could be very fast, making it hard for users to see the "Saving..." text. Maybe artificially add delay?
            dispatch(setIsSaving(false))
        }
        save()
        
    }, [debouncedPanelContent])
}

export function useReorderPanels() {
    const dispatch = useDispatch()
    return payload => dispatch(actions.reoder(payload))
}


// Utility

export function isPanelOpen(id) {
    return !!selectors.selectById(store.getState(), id)
}

export function serializePanel(id) {
    const panel = selectors.selectById(store.getState(), id)

    return panel ?
        (getPanelType(panel.type)?.serialize?.(panel) ?? '') :
        ''
}


// Other exports

export {
    actions as panelsActions,
    selectors as panelsSelectors
}