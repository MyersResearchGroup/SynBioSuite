import { deleteFileInOneDrive } from "../../microsoft-utils/oneDrive/deleteOneDriveFile"
import { updateFileInOneDrive } from "../../microsoft-utils/oneDrive/updateOneDrive"
import { isPanelOpen, serializePanel } from "../../redux/hooks/panelsHooks"


export default {
    FileSave: {
        id: createId("microsoft-file-save"),
        title: "Save File",
        shortTitle: "Save",
        description: "Save a file to Microsoft OneDrive",
        arguments: [
            {
                name: "file",
                prompt: "Enter the file object as returned from the graph API to be saved"
            }
        ],
        execute: async file => {
            if (!file)
                return "File doesn't exist."

            if (!isPanelOpen(file))
                return "Panel isn't open."

            // save
            await updateFileInOneDrive(file, serializePanel(file))
        }
    },
    FileDelete: {
        id: createId('microsoft-file-delete'),
        title: "Delete File",
        shortTitle: "Delete",
        description: "Delete a file from Microsoft OneDrive",
        color: "red",
        arguments: [
            {
                name: "file",
                prompt: "Enter the file object as returned from the graph API"
            }
        ],
        execute: async file => {
            await deleteFileInOneDrive(file.id)
        }
    },
    FileDownload: {
        id: createId("microsoft-file-download"),
        title: "Download File",
        shortTitle: "Download",
        description: "Download a file from Microsoft OneDrive",
        arguments: [
            {
                name: "file",
                prompt: "Enter the file object as returned from the graph API"
            }
        ],
        execute: async file => {
            const downloadUrl = file["@microsoft.graph.downloadUrl"]
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = downloadUrl;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
        }
    },
}




// Utility 

function createId(name) {
    return "synbio.command." + name
}