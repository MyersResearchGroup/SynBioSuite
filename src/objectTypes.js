import { BiWorld } from "react-icons/bi"
import { IoAnalyticsSharp } from "react-icons/io5"
import { TbComponents } from "react-icons/tb"

export const ObjectTypes = {
    SBOL: {
        id: "synbio.object-type.sbol",
        title: "SBOL Component",
        listTitle: "SBOL Components",
        fileMatch: /<sbol:/,
        icon: TbComponents,
        createable: true,
        extension: '.xml',
        badgeLabel: "SBOL",
    },
    SBML: {
        id: "synbio.object-type.sbml",
        title: "SBML File",
        listTitle: "SBML Files",
        fileMatch: /<sbml/,
        importable: true,
        badgeLabel: "SBML",
    },
    OMEX: {
        id: "synbio.object-type.omex-archive",
        title: "OMEX Archive",
        listTitle: "OMEX Archives",
        fileNameMatch: /\.omex$/,
        icon: BiWorld,
        importable: true,
        badgeLabel: "OMEX",
    },
    Analysis: {
        id: "synbio.object-type.analysis",
        title: "Analysis",
        listTitle: "Analyses",
        fileNameMatch: /\.analysis$/,
        icon: IoAnalyticsSharp,
        createable: true,
        extension: '.analysis',
    }
}

export function getObjectType(id) {
    return Object.values(ObjectTypes).find(ot => ot.id == id)
}

export async function classifyFile(file) {
    // try to match by file name
    const matchFromFileName = Object.values(ObjectTypes).find(
        ot => ot.fileNameMatch?.test(file.name)
    )?.id
    if(matchFromFileName)
        return matchFromFileName

    // otherwise, read file content
    const fileContent = await (await file.getFile()).text()
    return Object.values(ObjectTypes).find(
        ot => ot.fileMatch?.test(fileContent)
    )?.id
}