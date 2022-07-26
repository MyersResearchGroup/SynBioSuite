import ExplorerActivityView from "./components/activities/explorer/ExplorerActivityView"
import { FileIcon } from "./icons"

export const Activities = {
    FileSystemExplorer: {
        id: "synbio.activity.file-system-explorer",
        title: "Explorer",
        component: ExplorerActivityView,
        icon: FileIcon
    },
}

export function getActivity(id) {
    return Object.values(Activities).find(act => act.id == id)
}