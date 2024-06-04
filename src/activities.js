import ExplorerActivityView from "./components/activities/explorer/ExplorerActivityView"
import BugReportView from "./components/activities/explorer/BugReportView"
import { FileIcon, RemoteControlIcon, BugReport } from "./icons"

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
    BugReport: {
        id: "synbio.activity.bug-report",
        title: "Report Bug",
        component: BugReportView,
        icon: BugReport,
       
    },
}

export function getActivity(id) {
    return Object.values(Activities).find(act => act.id == id)
}