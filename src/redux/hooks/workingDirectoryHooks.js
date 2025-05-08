import { workingDirectorySlice } from '../store'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { classifyFile } from "../../objectTypes"
import { useOpenPanel, useCloseAllPanels, usePanelIds, useClosePanel, panelsSelectors } from "./panelsHooks"

const { actions, selectors } = workingDirectorySlice


// Selector hooks

export const useFiles = () => useSelector(selectors.selectAll)
export const useFile = id => useSelector(state => selectors.selectById(state, id))

export function useWorkingDirectory() {
    
    const dispatch = useDispatch()
    const panelIds = usePanelIds()
    const closePanel = useClosePanel()
    const closeAllPanels = useCloseAllPanels()

    return [
        /* workingDirectory */  useSelector(state => state.workingDirectory.directoryHandle),
        /* setWorkingDirectory */ (newWorkDir, closePanels = true) => {
            // read files
            findFilesInDirectory(newWorkDir)
                .then(foundFiles => {
                    dispatch(actions.setWorkingDirectory(newWorkDir))
                    dispatch(actions.setFiles(foundFiles))

                    // if closePanels is true, close all panels and return
                    if (closePanels) {
                        closeAllPanels()
                        return
                    }

                    // otherwise, we'll search for stale panels and close those
                    panelIds.forEach(panelId => {
                        !foundFiles.find(file => file.id == panelId) &&
                            closePanel(panelId, false)
                    })
                })
        }
    ]
}


// Action hooks


export function useCreateFile() {
    const dispatch = useDispatch()
    const openPanel = useOpenPanel()
    const workDir = useSelector(state => state.workingDirectory.directoryHandle)
    return (fileName, objectType, directory = workDir) => { // Optional arg directory in which the file will be created 
        directory.getFileHandle(fileName, { create: true })
            .then(fileHandle => {
                addFileMetadata(fileHandle, directory.name, { objectType })
                dispatch(actions.addFile(fileHandle))
                openPanel(fileHandle)
            })
    }
}

export function useCreateAssemblyFile() {
    const dispatch = useDispatch()
    const workDir = useSelector(state => state.workingDirectory.directoryHandle)
    return async (fileName, objectType, directory = workDir) => { // Optional arg directory in which the file will be created 
        const fileHandle = directory.getFileHandle(fileName, { create: true })
        addFileMetadata(fileHandle, directory.name, { objectType })
        dispatch(actions.addFile(fileHandle))
        return fileHandle
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
                addFileMetadata(fileHandle, null)
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

export async function findFilesInDirectory(dirHandle) {
    const files = []


    // loop through async iterator of file names (called keys here)
    for await (const handle of dirHandle.values()) {
        if (handle.kind == 'file') {
            await addFileMetadata(handle, null)
            files.push(handle)
        }

    }

    for await (const [name, subHandle] of dirHandle.entries()) {
        if (subHandle.kind === 'directory') {
            for await (const handle of subHandle.values()) {
            if (handle.kind === 'file') {
                await addFileMetadata(handle, name)
                files.push(handle)
            }
            }
        }
    }

    return files
}

async function addFileMetadata(handle, subDirectoryName, { objectType } = {}) {
    // handle.id = uuidv4()
    if (subDirectoryName === null) {
        handle.id = handle.name;
    } else {
        handle.id = (subDirectoryName + '/' + handle.name);
    }
    handle.objectType = objectType || await classifyFile(handle, subDirectoryName)
}

export function titleFromFileName(fileName) {
    return fileName?.match(/([\w\W]+)\./)?.[1]
}

export async function writeToFileHandle(fileHandle, content) {
    console.debug("Saving to file...")
    const writableStream = await fileHandle.createWritable()        // create write stream
    await writableStream.write(content)                             // write panel content
    await writableStream.close()                                    // close stream
    console.debug("Saved file:", fileHandle.name)
}


// Other exports

export { 
    actions as workDirActions,
    selectors as workDirSelectors
}