import ExplorerActivityView from "./components/activities/explorer/ExplorerActivityView"
import BugReportView from "./components/activities/explorer/BugReportView"
import GitHubView from "./components/activities/explorer/GitHubView";
import { FileIcon, RemoteControlIcon, BugReport, ProfileGreen, ProfileOrange, ProfileRed, ProfileWhite } from "./icons"
import { RiGithubFill } from "react-icons/ri";



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

    // Any activities below will be pushed to the bottom of the toolbar
    LoginStatusPanel: {
        id: "synbio.activity.login-status-panel",
        title: "Check Login Status",
        component: ExplorerActivityView,
        icon: ProfileWhite,
        mt: 'auto'
    },
    GitHub: {
        id: "synbio.activity.GitHub",
        title: "GitHub and Website ",
        component: GitHubView,
        icon: RiGithubFill,
    },
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