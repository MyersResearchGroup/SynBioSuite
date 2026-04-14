import { FcAddDatabase } from "react-icons/fc";
import { FaFileArchive } from "react-icons/fa";
import SBOLEditorPanel from "./components/panels/sbol-editor/SBOLEditorPanel";
import SimulatorPanel from "./components/panels/simulator/SimulatorPanel";
import TransformationPanel from "./components/panels/buildplans/BuildPlansPanel";
import SynBioHubPanel from "./components/panels/SynBioHubPanel";
import SeqImprovePanel from "./components/panels/SeqImprovePanel";
import ResourcesPanel from "./components/panels/resources-editor/ResourcesPanel";
import { CanvasIcon, SimulationIcon, SynBioHub } from "./icons";
import CollectionPanel from "./components/panels/xdc/CollectionPanel";
import { ObjectTypes, BLANK_SBOL } from "./objectTypes";
import { GiSewingMachine, GiThorHammer } from "react-icons/gi";
import { PiMicrosoftExcelLogoFill } from "react-icons/pi";
import ExcelFilePanel from "./components/panels/ExcelFIlePanel";


export const PanelTypes = {
    Resources: {
        id: "synbio.panel-type.resources",
        title: "Uploader",
        tooltip: {
            description: "Upload and organize resource and package files.",
            instructions: "Use the form in this panel to add files and track uploads."
        },
        component: ResourcesPanel,
        objectTypes: [ ObjectTypes.Resources.id, ObjectTypes.Strains.id, ObjectTypes.SampleDesigns.id, ObjectTypes.Metadata.id ],
        icon: FaFileArchive,

        deserialize: content => {
            try {
                return JSON.parse(content)
            }
            catch {
                return {}
            }
        },

        serialize: panel => {
            const { id, fileHandle, type, ...restOfPanel } = panel
            return JSON.stringify(restOfPanel)
        }
    }, 
    Simulator: {
        id: "synbio.panel-type.simulator",
        title: "iBioSim Analysis",
        tooltip: {
            description: "Configure and run simulation analysis workflows.",
            instructions: "Complete setup steps, run analysis, and review results tabs."
        },
        component: SimulatorPanel,
        objectTypes: [ ObjectTypes.Analysis.id, ObjectTypes.SBML.id ],
        icon: SimulationIcon,

        deserialize: content => {
            const trimmed = content.trimStart()
            if (trimmed.includes('sbml.org/sbml')) {
                return { sbml: content }
            }
            try {
                return JSON.parse(content)
            }
            catch {
                return {}
            }
        },

        serialize: panel => {
            if (panel.sbml && panel.fileHandle?.objectType === ObjectTypes.SBML.id) {
                return panel.sbml
            }
            const { id, fileHandle, type, ...restOfPanel } = panel
            return JSON.stringify(restOfPanel)
        }
    },
    SBOLEditor: {
        id: "synbio.panel-type.sbol-editor",
        title: "SBOL Canvas",
        tooltip: {
            description: "Visual editor for SBOL designs.",
            instructions: "Open a design file, edit in canvas, then save your changes."
        },
        component: SBOLEditorPanel,
        objectTypes: [ ObjectTypes.SBOL.id, ObjectTypes.Plasmids.id ],
        icon: CanvasIcon,

        deserialize: content => ({
            sbol: content
        }),

        serialize: panel => {
            if (!panel.sbol || panel.sbol.trim() === "") {
                return BLANK_SBOL
            }
            return panel.sbol;
        }
    },
    BuildPlans: {
        id: "synbio.panel-type.buildplans",
        title: "Build Plans",
        tooltip: {
            description: "Create assembly and transformation build instructions.",
            instructions: "Step through the tabs to generate complete build plans."
        },
        component: TransformationPanel,
        objectTypes: [ ObjectTypes.BuildPlans.id ],
        icon: GiSewingMachine,

        deserialize: content => {
            try {
                return JSON.parse(content)
            }
            catch {
                return {}
            }
        },

        serialize: panel => {
            const { id, fileHandle, type, ...restOfPanel } = panel
            return JSON.stringify(restOfPanel)
        }
    },
    Experiment: {
        id: "synbio.panel-type.data-collector",
        title: "Data Collector",
        tooltip: {
            description: "Capture and review experiment collection data.",
            instructions: "Use setup tools in this panel to structure collected records."
        },
        component: CollectionPanel,
        objectTypes: [ ObjectTypes.Studies.id ],
        icon: FcAddDatabase,

        //To be implemented
        //Reads contents of file and returns object
        deserialize: content => {
            try {
                return JSON.parse(content)
            }
            catch {
                return {}
            }
        },

        serialize: panel => {
            const { id, fileHandle, type, ...restOfPanel } = panel
            return JSON.stringify(restOfPanel)
        }
    },
    ExcelFile: {
        id: "synbio.panel-type.excel-file",
        title: "Experimental Setup",
        tooltip: {
            description: "Open and review experimental setup spreadsheets.",
            instructions: "Load the file and navigate sheets for setup validation."
        },
        component: ExcelFilePanel,
        objectTypes: [ObjectTypes.Metadata.id],
        icon: PiMicrosoftExcelLogoFill,
        deserialize: content => ({
            file: content
        }),
        serialize: panel => panel.file,
        useBuffer: true
    },
    SynBioHub: {
        id: "synbio.panel-type.synbiohub",
        title: "SynBioHub",
        tooltip: {
            description: "Interact with SynBioHub registry content.",
            instructions: "Search or browse available entries and open selected items."
        },
        component: SynBioHubPanel,
        icon: SynBioHub,
    },
    SeqImprove: {
        id: "synbio.panel-type.seqimprove",
        title: "SeqImprove",
        tooltip: {
            description: "Open sequence improvement workflows.",
            instructions: "Use this panel to review and refine sequence annotations."
        },
        component: SeqImprovePanel,
        icon: SynBioHub,
    }
}

export function getPanelType(id) {
    return Object.values(PanelTypes).find(pt => pt.id == id)
}

export function getPanelTypeForObject(objectType) {
    return Object.values(PanelTypes).find(pt => pt.objectTypes.includes(objectType))
}
