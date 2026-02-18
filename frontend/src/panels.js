import { FcAddDatabase } from "react-icons/fc";
import { FaFileArchive } from "react-icons/fa";
import SBOLEditorPanel from "./components/panels/sbol-editor/SBOLEditorPanel";
import SimulatorPanel from "./components/panels/simulator/SimulatorPanel";
import AssemblyPanel from "./components/panels/assembly-editor/AssemblyPanel";
import TransformationPanel from "./components/panels/transformations/TransformationPanel";
import SynBioHubPanel from "./components/panels/SynBioHubPanel";
import SeqImprovePanel from "./components/panels/SeqImprovePanel";
import ResourcesPanel from "./components/panels/resources-editor/ResourcesPanel";
import { CanvasIcon, SimulationIcon, SynBioHub } from "./icons";
import CollectionPanel from "./components/panels/xdc/CollectionPanel";
import { ObjectTypes } from "./objectTypes";
import { GiSewingMachine, GiThorHammer } from "react-icons/gi";
import { PiMicrosoftExcelLogoFill } from "react-icons/pi";
import ExcelFilePanel from "./components/panels/ExcelFIlePanel";


export const PanelTypes = {
    Resources: {
        id: "synbio.panel-type.resources",
        title: "Uploader",
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
        component: SimulatorPanel,
        objectTypes: [ ObjectTypes.Analysis.id ],
        icon: SimulationIcon,

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
            return `<?xml version="1.0" ?>
                <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:sbol="http://sbols.org/v2#" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:prov="http://www.w3.org/ns/prov#" xmlns:om="http://www.ontology-of-units-of-measure.org/resource/om-2/" xmlns:SBOLCanvas="https://sbolcanvas.org/">
                <sbol:ModuleDefinition rdf:about="https://sbolcanvas.org/module1">
                    <sbol:persistentIdentity rdf:resource="https://sbolcanvas.org/module1"/>
                    <sbol:displayId>module1</sbol:displayId>
                </sbol:ModuleDefinition>
                <SBOLCanvas:Layout rdf:about="https://sbolcanvas.org/module1_Layout">
                    <sbol:persistentIdentity rdf:resource="https://sbolcanvas.org/module1_Layout"/>
                    <sbol:displayId>module1_Layout</sbol:displayId>
                    <SBOLCanvas:objectRef rdf:resource="https://sbolcanvas.org/module1"/>
                </SBOLCanvas:Layout>
                </rdf:RDF>`;
            }
            return panel.sbol;
        }
    },
    Transformations: {
        id: "synbio.panel-type.transformations",
        title: "Transformations",
        component: TransformationPanel,
        objectTypes: [ ObjectTypes.Transformations.id ],
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
    AssemblyPlanCreator: {
        id: "synbio.panel-type.assembly-plan-creator",
        title: "Assembly Plan Creator",
        component: AssemblyPanel,
        objectTypes: [ ObjectTypes.Assembly.id ],
        icon: GiThorHammer,

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
        component: CollectionPanel,
        objectTypes: [ ObjectTypes.Experiments.id ],
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
