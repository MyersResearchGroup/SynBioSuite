import { createEntityAdapter, createSlice } from "@reduxjs/toolkit"
import { useSelector, useDispatch } from 'react-redux'
import { useOpenPanel, useCloseAllPanels } from "./panelsSlice"
import { classifyFile } from "../../objectTypes"
import { v4 as uuidv4 } from 'uuid'

// Create slice and adapter

const workDirAdapter = createEntityAdapter()
const initialState = workDirAdapter.getInitialState()

export const workDirSlice = createSlice({
    name: 'workingDirectory',
    initialState,
    reducers: {
        addFile: workDirAdapter.addOne,
        addFiles: workDirAdapter.addMany,
        setFiles: workDirAdapter.setAll,
        setWorkingDirectory: (state, action) => {
            state.directoryHandle = action.payload
        },
    }
})

const actions = workDirSlice.actions
const selectors = workDirAdapter.getSelectors(state => state.workingDirectory)


// Selector hooks

export const useFiles = () => useSelector(selectors.selectAll)
export const useFile = id => useSelector(state => selectors.selectById(state, id))

export function useWorkingDirectory() {
    const dispatch = useDispatch()
    const closeAllPanels = useCloseAllPanels()
    return [
        /* workingDirectory */  useSelector(state => state.workingDirectory.directoryHandle),
        /* setWorkingDirectory */ (newWorkDir, closePanels = true) => {
            // read files
            findFilesInDirectory(newWorkDir)
                .then(foundFiles => {
                    dispatch(actions.setWorkingDirectory(newWorkDir))
                    dispatch(actions.setFiles(foundFiles))
                    closePanels && closeAllPanels()
                })
        }
    ]
}


// Action hooks

export function useCreateFile() {
    const dispatch = useDispatch()
    const openPanel = useOpenPanel()
    return ({ extension, suggestedName, typeDescription }) => {
        window.showSaveFilePicker({
            suggestedName,
            types: [{
                description: typeDescription,
                accept: { 'text/plain': [extension] }
            }]
        })
            .then(fileHandle => {
                addFileMetadata(fileHandle)
                dispatch(actions.addFile(fileHandle))
                openPanel(fileHandle)
            })
    }
}


// Utility

async function findFilesInDirectory(dirHandle) {
    const files = []

    // loop through async iterator of file names (called keys here)
    for await (const handle of dirHandle.values()) {
        if(handle.kind == 'file') {
            addFileMetadata(handle)
            files.push(handle)
        }
    }

    return files
}

function addFileMetadata(handle) {
    // handle.id = uuidv4()
    handle.id = handle.name
    handle.objectType = classifyFile(handle.name)
}

export function titleFromFileName(fileName) {
    return fileName?.match(/([\w\W]+)\./)?.[1]
}


// Exports

export default workDirSlice.reducer
export const workDirActions = actions
export const workDirSelectors = selectors