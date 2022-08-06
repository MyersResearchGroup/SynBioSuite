import { workDirActions } from "./redux/slices/workingDirectorySlice"
import store from "./redux/store"


export default {
    FileDelete: {
        id: createId('file-delete'),
        title: "Delete File",
        shortTitle: "Delete",
        description: "delete a file",
        color: "red",
        arguments: [
            {
                name: "file",
                prompt: "Enter the file name or ID"
            }
        ],
        execute: async idOrName => {
            // try to find file by ID first, then by name
            const file =
                store.getState().workingDirectory.entities[idOrName]
                || Object.values(store.getState().workingDirectory.entities).find(f => f.name == idOrName)

            // quit if this file doesn't exist
            if(!file)
                return "File doesn't exist."
            
            // delete file from disk
            await store.getState().workingDirectory.directoryHandle?.removeEntry(file.name)

            // remove file from store
            store.dispatch(workDirActions.removeFile(file.id))
        }
    }
}

function createId(name) {
    return "synbio.command." + name
}
