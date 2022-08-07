import { createEntityAdapter, createSlice } from "@reduxjs/toolkit"
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { useOpenPanel, useCloseAllPanels } from "./panelsSlice"
import { classifyFile } from "../../objectTypes"

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
        removeFile: workDirAdapter.removeOne,
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
    const workDir = useSelector(state => state.workingDirectory.directoryHandle)
    return fileName => {
        workDir.getFileHandle(fileName, { create: true })
            .then(fileHandle => {
                addFileMetadata(fileHandle)
                dispatch(actions.addFile(fileHandle))
                openPanel(fileHandle)
            })
    }
}

export function useCreateFileWithFilePicker() {
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

export function useSafeName(baseName) {

    // using shallow equal selector for derived values
    const existing = useSelector(state =>
        selectors.selectAll(state)
            .map(file => titleFromFileName(file.name)),
        shallowEqual
    )

    // recursion to find safe name -- not strictly necessary but fun 😈
    // and simple to write
    const findSafeName = (depth = 1) => {
        const proposedName = depth == 1 ? baseName : `${baseName} ${depth}`
        return existing.includes(proposedName) ?
            findSafeName(depth + 1) :
            proposedName
    }

    return () => findSafeName()
}


// Utility

async function findFilesInDirectory(dirHandle) {
    const files = []

    // loop through async iterator of file names (called keys here)
    for await (const handle of dirHandle.values()) {
        if (handle.kind == 'file') {
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