import ExplorerActivityView from "./components/activities/explorer/ExplorerActivityView"
import BugReportView from "./components/activities/explorer/BugReportView"
import GitHubView from "./components/activities/explorer/GitHubView";
import LoginStatus from "./components/activities/explorer/LoginStatus";
import { FileIcon, RemoteControlIcon, BugReport, ProfileGreen, ProfileOrange, ProfileRed, ProfileWhite } from "./icons"
import { RiGithubFill } from "react-icons/ri";
import { TiPipette } from "react-icons/ti";
import { ObjectTypes } from "./objectTypes";
import { FaGraduationCap } from "react-icons/fa";
import { BsGraphUpArrow } from "react-icons/bs";
import { BiSolidFlask } from "react-icons/bi";
import { HiOutlinePuzzlePiece } from "react-icons/hi2";
import { PiDna } from "react-icons/pi";

export const Activities = {
    LocalFileExplorer: {
        id: "synbio.activity.entire-workflow",
        title: "Entire Workflow",
        component: ExplorerActivityView,
        icon: FileIcon,
        objectTypesToList: Object.values(ObjectTypes).map(object => object.id) // Local Explorer should list every object
    },
    ResourceSelection: {
        id: "synbio.activity.resource-selection",
        title: "Resources",
        component: ExplorerActivityView,
        icon: HiOutlinePuzzlePiece,
        objectTypesToList: [
            "synbio.object-type.synbiohub",
            ObjectTypes.Chassis.id,
            ObjectTypes.Chemicals.id,
            ObjectTypes.Medias.id,
            ObjectTypes.Parts.id,
            ObjectTypes.Resources.id
        ] 
    },
    Design: {
        id: "synbio.activity.design",
        title: "Design",
        component: ExplorerActivityView,
        icon: PiDna,
        objectTypesToList: [
            ObjectTypes.SBOL.id,
        ]
    },
    Model: {
        id: "synbio.activity.models",
        title: "Model",
        component: ExplorerActivityView,
        icon: BsGraphUpArrow,
        objectTypesToList: [
            ObjectTypes.SBML.id,
            ObjectTypes.OMEX.id,
            ObjectTypes.Analysis.id
        ]
    },
    Build: {
        id: "synbio.activity.build",
        title: "Build",
        component: ExplorerActivityView,
        icon: TiPipette,
        objectTypesToList: [
            ObjectTypes.Plasmids.id,
            ObjectTypes.Strains.id,
            ObjectTypes.Transformations.id, 
            ObjectTypes.Assembly.id,
        ]
    },
    Test: {
        id: "synbio.activity.test",
        title: "Test",
        component: ExplorerActivityView,
        icon: BiSolidFlask,
        objectTypesToList: [
            ObjectTypes.SampleDesigns.id,
            ObjectTypes.Experiments.id,
            ObjectTypes.Metadata.id,
            ObjectTypes.Results.id,
            ObjectTypes.PlateReader.id
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

