import { BiWorld } from "react-icons/bi"
import { IoAnalyticsSharp } from "react-icons/io5"
import { TbComponents } from "react-icons/tb"
import { PiTreeStructureFill } from "react-icons/pi"
import { GiSewingMachine } from "react-icons/gi"
import { GiThorHammer} from "react-icons/gi"
import { RiGitRepositoryLine } from "react-icons/ri";
import { GrTestDesktop } from "react-icons/gr";
import { MdAlignVerticalTop } from "react-icons/md";
import { VscOutput } from "react-icons/vsc";
import download from "browser-downloads"



export const ObjectTypes = {
    SYNBIOHUB: {
        id: "synbio.object-type.synbiohub",
        title: "SynBioHub Registry",
        listTitle: "SynBioHub Registries",
        icon: RiGitRepositoryLine,
        isRepository: true,
        defaultRegistry: "https://synbiohub.org"
    },
    SBOL: {
        id: "synbio.object-type.sbol",
        title: "Design",
        listTitle: "Designs",
        fileMatch: /<sbol:/,
        icon: TbComponents,
        createable: true,
        uploadable: false,
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
        uploadable: false,
        extension: '.analysis',
    },
    Plasmids: {
        id: "synbio.object-type.plasmid",
        title: "Plasmid",
        listTitle: "Plasmids",
        createable: true,
        extension: '.xml',
        icon: TbComponents,
        fileNameMatch: /\.xml$/,
        badgeLabel: "PLASMID",
        subdirectory: "plasmids"
    },
    Assembly: {
        id: "synbio.object-type.assembly-plan",
        title: "Assembly Plan",
        listTitle: "Assembly Plans",
        fileNameMatch: /\.json$/,
        icon: GiSewingMachine,
        createable: true,
        extension: '.json',
        subdirectory: "assemblyPlans"
    },
    Build: {
        id: "synbio.object-type.build",
        title: "Build",
        listTitle: "Builds",
        fileNameMatch: /\.json$/,
        icon: GiThorHammer,
        createable: true,
        extension: '.json',
        subdirectory: "builds"
    },
    Experiments: {
        id: "synbio.object-type.experiment",
        title: "Experiments",
        listTitle: "Experiments",
        fileNameMatch: /\.xdc$/,
        icon: GrTestDesktop,
        createable: true,
        extension: ".xdc",
        subdirectory: "xdc"
    },
    MetadataPlasmids: {
        id: "synbio.object-type.experimental-data-plasmids",
        title: "Plasmid Metadata",
        listTitle: "Experimental Metadata: Plasmids",
        fileNameMatch: /\.(xlsm|xlsx)$/,
        icon: MdAlignVerticalTop,
        createable: false,
        importable: true,
        subdirectory: "experimentalSetupsPlasmids",
    },
    MetadataChassis: {
        id: "synbio.object-type.experimental-data-chassis",
        title: "Chassis Metadata",
        listTitle: "Experimental Metadata: Chassis",
        fileNameMatch: /\.(xlsm|xlsx)$/,
        icon: MdAlignVerticalTop,
        createable: false,
        importable: true,
        subdirectory: "experimentalSetupsChassis",
        downloadable: true,
    },
    MetadataChemicals: {
        id: "synbio.object-type.experimental-data-chemical",
        title: "Chemical Metadata",
        listTitle: "Experimental Metadata: Chemicals",
        fileNameMatch: /\.(xlsm|xlsx)$/,
        icon: MdAlignVerticalTop,
        createable: false,
        importable: true,
        subdirectory: "experimentalSetupsChemicals",
        downloadable: true,
    },
    MetadataMedias: {
        id: "synbio.object-type.experimental-data-medias",
        title: "Medias Metadata",
        listTitle: "Experimental Metadata: Medias",
        fileNameMatch: /\.(xlsm|xlsx)$/,
        icon: MdAlignVerticalTop,
        createable: false,
        importable: true,
        subdirectory: "experimentalSetupsMedias",
        downloadable: true,
    },
    MetadataStrains: {
        id: "synbio.object-type.experimental-data-strains",
        title: "Strain Metadata",
        listTitle: "Experimental Metadata: Strains",
        fileNameMatch: /\.(xlsm|xlsx)$/,
        icon: MdAlignVerticalTop,
        createable: false,
        importable: true,
        subdirectory: "experimentalSetupsStrains",
        downloadable: true,
    },
    MetadataSampleDesigns: {
        id: "synbio.object-type.experimental-data-designs",
        title: "Design Metadata",
        listTitle: "Experimental Metadata: Designs",
        fileNameMatch: /\.(xlsm|xlsx)$/,
        icon: MdAlignVerticalTop,
        createable: false,
        importable: true,
        subdirectory: "experimentalSetupsDesigns",
        downloadable: true,
    },
    Metadata: {
        id: "synbio.object-type.experimental-data",
        title: "Metadata",
        listTitle: "Experimental Metadata",
        fileNameMatch: /\.(xlsm|xlsx)$/,
        icon: MdAlignVerticalTop,
        createable: false,
        importable: true,
        subdirectory: "experimentalSetups"
    },
    Results: {
        id: "synbio.object-type.experimental-results",
        title: "Experimental Results",
        listTitle: "Experimental Results",
        fileNameMatch: /\.(xlsm|xlsx)$/,
        icon: VscOutput,
        createable: false,
        importable: true,
        subdirectory: "experimentalResults",
    },
    Flapjack: {
        id: "synbio.object-type.flapjack",
        title: "Flapjack Registry",
        listTitle: "Flapjack Registries",
        icon: RiGitRepositoryLine,
        isRepository: true,
        defaultRegistry: "https://ebugsfj.synbiohub.org"
    },
}

export function getObjectType(id) {
    return Object.values(ObjectTypes).find(ot => ot.id == id)
}

function getOBjectBySubdirectory(subDirectoryName) {
    if (!subDirectoryName) {
        return null
    }
    return Object.values(ObjectTypes).filter(ot => ot.subdirectory).find(ot => ot.subdirectory.toLowerCase() == subDirectoryName.toLowerCase())
}

export async function classifyFile(file, subDirectoryName) {
    // try to match by file name and
    const matchFromFileName = Object.values(ObjectTypes).filter(ot => !ot.subdirectory).find(
        ot => ot.fileNameMatch?.test(file.name)
    )?.id
    if (subDirectoryName == null && matchFromFileName) {
        return matchFromFileName;
    }
    else if(subDirectoryName == null){
        //read file content
        const fileContent = await (await file.getFile()).text()
        return Object.values(ObjectTypes).filter(ot => !ot.subdirectory).find(
            ot => ot.fileMatch?.test(fileContent)
        )?.id
    }
    else if (subDirectoryName) {
        // try to match by subdirectory name
        const matchFromSubdirectory = getOBjectBySubdirectory(subDirectoryName)
        if (matchFromSubdirectory) {
            return matchFromSubdirectory.id
        }
    }
}
