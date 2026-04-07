import { FcAddDatabase } from "react-icons/fc";
import { FaFileArchive } from "react-icons/fa";
import { APP_VERSION } from "./version";
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
        component: ResourcesPanel,
        objectTypes: [ ObjectTypes.Resources.id, ObjectTypes.Strains.id, ObjectTypes.SampleDesigns.id ],
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
            return JSON.stringify({ ...restOfPanel, _version: APP_VERSION })
        }
    }, 
    Simulator: {
        id: "synbio.panel-type.simulator",
        title: "iBioSim Analysis",
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
            return JSON.stringify({ ...restOfPanel, _version: APP_VERSION })
        }
    },
    SBOLEditor: {
        id: "synbio.panel-type.sbol-editor",
        title: "SBOL Canvas",
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
            return JSON.stringify({ ...restOfPanel, _version: APP_VERSION })
        }
    },
    Experiment: {
        id: "synbio.panel-type.data-collector",
        title: "Data Collector",
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
            return JSON.stringify({ ...restOfPanel, _version: APP_VERSION })
        }
    },
    SynBioHub: {
        id: "synbio.panel-type.synbiohub",
        title: "SynBioHub",
        component: SynBioHubPanel,
        icon: SynBioHub,
    },
    SeqImprove: {
        id: "synbio.panel-type.seqimprove",
        title: "SeqImprove",
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
