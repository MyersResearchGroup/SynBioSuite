import ExplorerActivityView from "./components/activities/explorer/ExplorerActivityView"
import BugReportView from "./components/activities/explorer/BugReportView"
import GitHubView from "./components/activities/explorer/GitHubView";
import LoginStatus from "./components/activities/explorer/LoginStatus";
import { FileIcon, RemoteControlIcon, BugReport, ProfileGreen, ProfileOrange, ProfileRed, ProfileWhite } from "./icons"
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
            "synbio.object-type.synbiohub"
        ] 
    },
    Design: {
        id: "synbio.activity.design",
        title: "Design",
        component: ExplorerActivityView,
        icon: BsGraphUpArrow,
        objectTypesToList: [
            ObjectTypes.SBOL.id,
            ObjectTypes.SBML.id,
            ObjectTypes.OMEX.id,
            ObjectTypes.Analysis.id
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
            ObjectTypes.Experiments.id,
            ObjectTypes.Metadata.id,
            ObjectTypes.Results.id
        ]
    },
    Learn: {
        id: "synbio.activity.learn",
        title: "Learn",
        component: ExplorerActivityView,
        icon: FaGraduationCap,
        objectTypesToList: [
            "synbio.object-type.flapjack"
        ]
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
        component: LoginStatus,
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

