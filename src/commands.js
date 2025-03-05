import store from "./redux/store"
import { isPanelOpen, panelsActions, serializePanel } from "./redux/hooks/panelsHooks"
import { workDirActions, writeToFileHandle } from "./redux/hooks/workingDirectoryHooks"


export default {
    FileDelete: {
        id: createId('file-delete'),
        title: "Delete File",
        shortTitle: "Delete",
        description: "Delete a file",
        color: "red",
        arguments: [
            {
                name: "fileNameOrId",
                prompt: "Enter the file name or ID"
            }
        ],
        execute: async fileNameOrId => {
            // try to find file by ID first, then by name
            const file = findFileByNameOrId(fileNameOrId)
            // quit if this file doesn't exist
            if (!file)
                return "File doesn't exist."
            
            // delete file from disk, try to see if in subdirectory first else delete from root
            const directory = file.id.split("/")[0]
            try{
                const tempDirectory = await store.getState().workingDirectory.directoryHandle.getDirectoryHandle(directory)
                await tempDirectory.removeEntry(file.name)
            }
            catch{
                await store.getState().workingDirectory.directoryHandle?.removeEntry(file.name)
            }

            // close panel if it's open
            store.dispatch(panelsActions.closePanel(file.id))

            // remove file from store
            store.dispatch(workDirActions.removeFile(file.id))
        }
    },

    FileSave: {
        id: createId("file-save"),
        title: "Save File",
        shortTitle: "Save",
        description: "Save a file",
        arguments: [
            {
                name: "fileNameOrId",
                prompt: "Enter the file name or ID"
            }
        ],
        execute: async fileNameOrId => {
            // try to find file by ID first, then by name
            const file = findFileByNameOrId(fileNameOrId)

            // quit if this file doesn't exist
            if (!file)
                return "File doesn't exist."

            // make sure panel is open
            if(!isPanelOpen(file.id))
                return "Panel isn't open."

            // save
            await writeToFileHandle(file, serializePanel(file.id))
        }
    }
}




// Utility 

function createId(name) {
    return "synbio.command." + name
}

function findFileByNameOrId(idOrName) {
    return store.getState().workingDirectory.entities[idOrName]
        || Object.values(store.getState().workingDirectory.entities).find(f => f.name == idOrName)
}