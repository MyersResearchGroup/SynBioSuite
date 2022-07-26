import { createSlice } from "@reduxjs/toolkit"
import { useSelector, useDispatch } from 'react-redux'
import { useOpenPanel, useResetPanels } from "./panelSlice"
import { classifyFile } from "../../objectTypes"
import { v4 as uuidv4 } from 'uuid'


// create slice
export const workingDirectorySlice = createSlice({
    name: 'workingDirectory',
    initialState: {
        handle: undefined,
        files: [],
    },
    reducers: {
        setWorkingDirectory: (state, action) => {
            const { handle, files } = action.payload
            state.handle = handle
            files.forEach(addFileMetaData)
            state.files = files
        },
        addHandle: (state, action) => {
            addFileMetaData(action.payload)
            state.files.push(action.payload)
        },
        addHandles: (state, action) => {
            action.payload.forEach(addFileMetaData)
            state.files.push(...action.payload)
        },
    }
})

// export actions & reducer
const actions = workingDirectorySlice.actions
export const workingDirectoryActions = actions
export default workingDirectorySlice.reducer


// custom hooks for selectors

export function useWorkingDirectory() {
    const dispatch = useDispatch()
    const resetPanels = useResetPanels()
    return [
        /* workingDirectory */  useSelector(state => state.workingDirectory.handle),
        /* setWorkingDirectory */ newWorkDir => {
            // read files
            findFilesInDirectory(newWorkDir)
                .then(foundFiles => {
                    dispatch(actions.setWorkingDirectory({
                        handle: newWorkDir,
                        files: foundFiles
                    }))
                    resetPanels()
                })
        },
        /* fileHandles */  useSelector(state => state.workingDirectory.files)
    ]
}

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
                dispatch(actions.addHandle(fileHandle))
                openPanel({ fileHandle })
            })
    }
}

export function useFile(fileId) {
    return [
        /* fileHandle */
        useSelector(
            state => state.workingDirectory.files.find(file => file.id == fileId)
        )
    ]
}


// Utility

function addFileMetaData(fileHandle) {
    fileHandle.objectType = classifyFile(fileHandle.name)
    fileHandle.id = uuidv4()
}

async function findFilesInDirectory(dirHandle) {
    const files = []

    // loop through async iterator of file names (called keys here)
    for await (const handle of dirHandle.values()) {
        handle.kind == 'file' && files.push(handle)
    }

    return files
}

export function titleFromFileName(fileName) {
    return fileName.match(/([\w\W]+)\./)?.[1]
}