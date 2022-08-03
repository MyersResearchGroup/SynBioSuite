import { BiWorld } from "react-icons/bi"
import { IoAnalyticsSharp } from "react-icons/io5"
import { TbComponents } from "react-icons/tb"

export const ObjectTypes = {
    SBOL: {
        id: "synbio.object-type.sbol",
        title: "SBOL Component",
        listTitle: "SBOL Components",
        fileMatch: /\.sbol$|\.component\.xml$/,
        icon: TbComponents,
        createable: true,
        extension: '.sbol',
        badgeLabel: "SBOL",
    },
    SBML: {
        id: "synbio.object-type.sbml",
        title: "SBML File",
        listTitle: "SBML Files",
        fileMatch: /\.xml$/,
        createable: false,
        badgeLabel: "SBML",
    },
    OMEX: {
        id: "synbio.object-type.omex-archive",
        title: "OMEX Archive",
        listTitle: "OMEX Archives",
        fileMatch: /\.omex$/,
        icon: BiWorld,
        createable: false,
        badgeLabel: "OMEX",
    },
    Analysis: {
        id: "synbio.object-type.analysis",
        title: "Analysis",
        listTitle: "Analyses",
        fileMatch: /\.analysis$/,
        icon: IoAnalyticsSharp,
        createable: true,
        extension: '.analysis',
    }
}

export function getObjectType(id) {
    return Object.values(ObjectTypes).find(ot => ot.id == id)
}

export function classifyFile(fileName) {
    return Object.values(ObjectTypes).find(
        ({ fileMatch }) => !!fileName?.match(fileMatch)
    )?.id
}