import ExplorerActivityView from "./components/activities/explorer/ExplorerActivityView"
import BugReportView from "./components/activities/explorer/BugReportView"
import GitHubView from "./components/activities/explorer/GitHubView";
import LoginStatus from "./components/activities/explorer/LoginStatus";
import { FileIcon, BugReport, ProfileWhite, MicrosoftLogo } from "./icons"
import { RiGithubFill } from "react-icons/ri";
import { TiPipette } from "react-icons/ti";
import { ObjectTypes } from "./objectTypes";
import { FaGraduationCap } from "react-icons/fa";
import { BsGraphUpArrow } from "react-icons/bs";
import { BiSolidFlask } from "react-icons/bi";
import { HiOutlinePuzzlePiece } from "react-icons/hi2";
import { PiDna } from "react-icons/pi";
import MicrosoftView from "./components/microsoft/MicrosoftView";
import MicrosoftExplorerActivityView from "./components/microsoft/MicrosoftExplorerActivityView";
import { CloudWeatherIcon } from '@fluentui/react-icons-mdl2';

export const Activities = {
    LocalFileExplorer: {
        id: "synbio.activity.entire-workflow",
        title: "Entire Workflow",
        tooltip: {
            description: "Browse all project files and tools in one place.",
            instructions: "Click to open the full explorer and manage any file type."
        },
        component: ExplorerActivityView,
        icon: FileIcon,
        objectTypesToList: Object.values(ObjectTypes).map(object => object.id) // Local Explorer should list every object
    },
    ResourceSelection: {
        id: "synbio.activity.resource-selection",
        title: "Resources",
        tooltip: {
            description: "Access registries and resource package files.",
            instructions: "Use this activity to open resources and upload related files."
        },
        component: ExplorerActivityView,
        icon: HiOutlinePuzzlePiece,
        objectTypesToList: [
            "synbio.object-type.synbiohub",
            ObjectTypes.Resources.id
        ] 
    },
    Design: {
        id: "synbio.activity.design",
        title: "Design",
        tooltip: {
            description: "Work with SBOL designs and plasmid assets.",
            instructions: "Select a design file here to open it in the design tooling."
        },
        component: ExplorerActivityView,
        icon: PiDna,
        objectTypesToList: [
            ObjectTypes.SBOL.id,
        ]
    },
    Model: {
        id: "synbio.activity.models",
        title: "Model",
        tooltip: {
            description: "Open and manage modeling and analysis files.",
            instructions: "Use this section for SBML, OMEX, and analysis workflows."
        },
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
        tooltip: {
            description: "Prepare build plans and strain/plasmid build assets.",
            instructions: "Open build-related files to configure execution-ready plans."
        },
        component: ExplorerActivityView,
        icon: TiPipette,
        objectTypesToList: [
            ObjectTypes.Plasmids.id,
            ObjectTypes.Strains.id,
            ObjectTypes.BuildPlans.id, 
        ]
    },
    Test: {
        id: "synbio.activity.test",
        title: "Test",
        tooltip: {
            description: "Review test inputs, metadata, and results artifacts.",
            instructions: "Choose files in this area to inspect testing data and outputs."
        },
        component: ExplorerActivityView,
        icon: BiSolidFlask,
        objectTypesToList: [
            ObjectTypes.SampleDesigns.id,
            ObjectTypes.Studies.id,
            ObjectTypes.Metadata.id,
            ObjectTypes.Results.id,
            ObjectTypes.PlateReader.id
        ]
    },
    Learn: {
        id: "synbio.activity.learn",
        title: "Learn",
        tooltip: {
            description: "Access learning-oriented datasets and analysis outputs.",
            instructions: "Open files here to review insights and interpretation resources."
        },
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
        tooltip: {
            description: "View and manage account authentication status.",
            instructions: "Click to open login controls and verify your current session."
        },
        component: LoginStatus,
        icon: ProfileWhite,
        mt: 'auto'
    },
    GitHub: {
        id: "synbio.activity.GitHub",
        title: "GitHub and Website ",
        tooltip: {
            description: "Quick links to project source and documentation.",
            instructions: "Open this panel to navigate to GitHub or website resources."
        },
        component: GitHubView,
        icon: RiGithubFill,
    },
    BugReport: {
        id: "synbio.activity.bug-report",
        title: "Report Bug",
        tooltip: {
            description: "Submit issues and feedback to improve the platform.",
            instructions: "Use this to report bugs with reproducible steps."
        },
        component: BugReportView,
        icon: BugReport,
    },
}

export const MicrosoftStatus = {
    id: "synbio.activity.microsoft-status",
    title: "Check Microsoft Login Status",
    tooltip: {
        description: "Check Microsoft account connection state.",
        instructions: "Open this to sign in, sign out, or verify account access."
    },
    component: MicrosoftView,
    icon: MicrosoftLogo
}

export const MicrosoftFileExplorer = {
    id: "synbio.activity.microsoft-file-explorer",
    title: "OneDrive Explorer",
    tooltip: {
        description: "Browse and open project files from OneDrive.",
        instructions: "Click to view cloud files and open them in SynBioSuite panels."
    },
    component: MicrosoftExplorerActivityView,
    icon: CloudWeatherIcon,
    objectTypesToList: Object.values(ObjectTypes).map(object => object.id)
}

export function getActivity(id) {
    return Object.values(Activities).find(act => act.id == id)
}
