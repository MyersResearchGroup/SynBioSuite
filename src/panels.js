import SBOLEditorPanel from "./components/panels/sbol-editor/SBOLEditorPanel";
import SimulatorPanel from "./components/panels/simulator/SimulatorPanel";
import { CanvasIcon, SimulationIcon } from "./icons";
import { ObjectTypes } from "./objectTypes";


export const PanelTypes = {
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

        serialize: panel => panel.sbol
    },
    SynBioHub: {
        id: "synbio.panel-type.synbiohub",
        title: "SynBioHub",
        component: SBOLEditorPanel,
        icon: CanvasIcon,
    }
}

export function getPanelType(id) {
    return Object.values(PanelTypes).find(pt => pt.id == id)
}

export function getPanelTypeForObject(objectType) {
    return Object.values(PanelTypes).find(pt => pt.objectTypes.includes(objectType))
}
