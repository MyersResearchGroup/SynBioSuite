import ExplorerActivityView from "./components/activities/explorer/ExplorerActivityView"
import BugReportView from "./components/activities/explorer/BugReportView"
import GitHubView from "./components/activities/explorer/GitHubView";
import { FileIcon, RemoteControlIcon, BugReport } from "./icons"
import { RiGithubFill } from "react-icons/ri";
import { GiThorHammer} from "react-icons/gi";
import { ObjectTypes } from "./objectTypes";
import { FaGraduationCap } from "react-icons/fa";
import { BsGraphUpArrow } from "react-icons/bs";
import { BiSolidFlask } from "react-icons/bi";
import { HiOutlinePuzzlePiece } from "react-icons/hi2";

export const Activities = {
    LocalFileExplorer: {
        id: "synbio.activity.entire-workflow",
        title: "Entire Workflow",
        component: ExplorerActivityView,
        icon: FileIcon,
        objectTypesToList: Object.values(ObjectTypes).map(object => object.id) // Local Explorer should list every object
    },
    PartsSelection: {
        id: "synbio.activity.parts-selection",
        title: "Parts Selection",
        component: ExplorerActivityView,
        icon: HiOutlinePuzzlePiece,
        objectTypesToList: [

        ] 
    },
    Design: {
        id: "synbio.activity.design",
        title: "Design",
        component: ExplorerActivityView,
        icon: BsGraphUpArrow,
        objectTypesToList: [

        ]
    },
    Build: {
        id: "synbio.activity.build",
        title: "Build",
        component: ExplorerActivityView,
        icon: GiThorHammer,
        objectTypesToList: [
            ObjectTypes.Plasmids.id
        ]
    },
    Test: {
        id: "synbio.activity.test",
        title: "Test",
        component: ExplorerActivityView,
        icon: BiSolidFlask,
        objectTypesToList: [

        ]
    },
    Learn: {
        id: "synbio.activity.learn",
        title: "Learn",
        component: ExplorerActivityView,
        icon: FaGraduationCap,
        objectTypesToList: [
            
        ]
    },
    // RemoteFileExplorer: {
    //     id: "synbio.activity.remote-file-explorer",
    //     title: "Remote Explorer",
    //     component: ExplorerActivityView,
    //     icon: RemoteControlIcon
    // },

    // Any activities below will be pushed to the bottom of the toolbar
    GitHub: {
        id: "synbio.activity.GitHub",
        title: "GitHub and Website ",
        component: GitHubView,
        icon: RiGithubFill,
        mt: 'auto'
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

