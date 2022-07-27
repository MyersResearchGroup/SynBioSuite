import ExplorerActivityView from "./components/activities/explorer/ExplorerActivityView"
import { FileIcon, RemoteControlIcon } from "./icons"

export const Activities = {
    LocalFileExplorer: {
        id: "synbio.activity.local-file-explorer",
        title: "Local Explorer",
        component: ExplorerActivityView,
        icon: FileIcon
    },
    // RemoteFileExplorer: {
    //     id: "synbio.activity.remote-file-explorer",
    //     title: "Remote Explorer",
    //     component: ExplorerActivityView,
    //     icon: RemoteControlIcon
    // },
}

export function getActivity(id) {
    return Object.values(Activities).find(act => act.id == id)
}