import { BiWorld } from "react-icons/bi"
import { IoAnalyticsSharp } from "react-icons/io5"
import { TbComponents } from "react-icons/tb"
import { PiTreeStructureFill } from "react-icons/pi"

export const ObjectTypes = {
    SBOL: {
        id: "synbio.object-type.sbol",
        title: "Design",
        listTitle: "Designs",
        fileMatch: /<sbol:/,
        icon: TbComponents,
        createable: true,
        extension: '.xml',
        badgeLabel: "SBOL",
    },
    SBML: {
        id: "synbio.object-type.sbml",
        title: "Model",
        listTitle: "Models",
        fileMatch: /<sbml/,
        icon: PiTreeStructureFill,
        importable: true,
        badgeLabel: "SBML",
    },
    OMEX: {
        id: "synbio.object-type.omex-archive",
        title: "Archive",
        listTitle: "Archives",
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
    },
    Plasmids:{
        id: "synbio.object-type.plasmid",
        title: "Plasmid",
        listTitle: "Plasmids",
        createable: true,
        extension: '.xml',
        icon: TbComponents,
        fileNameMatch: /\.xml$/
    }
}

export function getObjectType(id) {
    return Object.values(ObjectTypes).find(ot => ot.id == id)
}

export async function classifyFile(file, subDirectoryName) {
    // try to match by file name
    const matchFromFileName = Object.values(ObjectTypes).find(
        ot => ot.fileNameMatch?.test(file.name)
    )?.id
    if (!subDirectoryName && matchFromFileName && matchFromFileName && matchFromFileName != ObjectTypes.Plasmids.id) {
        return matchFromFileName;
    } 
    else if (subDirectoryName != null && subDirectoryName.toLowerCase() === "plasmid" && ObjectTypes.Plasmids.fileNameMatch?.test(file.name)) {
        return ObjectTypes.Plasmids.id;
    }
    // otherwise, read file content
    if(subDirectoryName == null){
        const fileContent = await (await file.getFile()).text()
        return Object.values(ObjectTypes).find(
            ot => ot.fileMatch?.test(fileContent)
        )?.id
    }
}