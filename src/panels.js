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

        onOpen: content => {
            try {
                return { state: JSON.parse(content) }
            }
            catch {
                return { state: {} }
            }
        },

        onSave: panel => JSON.stringify(panel.state)
    },
    SBOLEditor: {
        id: "synbio.panel-type.sbol-editor",
        title: "SBOL Canvas",
        component: SBOLEditorPanel,
        objectTypes: [ ObjectTypes.SBOL.id ],
        icon: CanvasIcon,

        onOpen: content => ({
            state: {
                sbol: content
            }
        }),

        onSave: panel => panel.state.sbol
    }
}

export function getPanelType(id) {
    return Object.values(PanelTypes).find(pt => pt.id == id)
}

export function getPanelTypeForObject(objectType) {
    return Object.values(PanelTypes).find(pt => pt.objectTypes.includes(objectType))
}
