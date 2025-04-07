import { BiWorld } from "react-icons/bi"
import { IoAnalyticsSharp } from "react-icons/io5"
import { TbComponents } from "react-icons/tb"
import { PiTreeStructureFill } from "react-icons/pi"
import { GiSewingMachine } from "react-icons/gi"
import { RiGitRepositoryLine } from "react-icons/ri";

export const ObjectTypes = {
    SYNBIOHUB: {
        id: "synbio.object-type.synbiohub",
        title: "SynBioHub Registry",
        listTitle: "SynBioHub Registries",
        icon: RiGitRepositoryLine,
        isRepository: true,
        defaultRegistry: "https://synbiohub.org"
    },
    Flapjack: {
        id: "synbio.object-type.flapjack",
        title: "Flapjack Registry",
        listTitle: "Flapjack Registries",
        icon: RiGitRepositoryLine,
        isRepository: true,
        defaultRegistry: "https://ebugsfj.synbiohub.org"
    },
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
    Assembly: {
        id: "synbio.object-type.assembly-plan",
        title: "Assembly Plan",
        listTitle: "Assembly Plans",
        fileNameMatch: /\.json$/,
        icon: GiSewingMachine,
        createable: true,
        extension: '.json',
    },
    Plasmids: {
        id: "synbio.object-type.plasmid",
        title: "Plasmid",
        listTitle: "Plasmids",
        createable: true,
        extension: '.xml',
        icon: TbComponents,
        fileNameMatch: /\.xml$/,
        badgeLabel: "PLASMID"
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
