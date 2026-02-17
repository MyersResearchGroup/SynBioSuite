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
import { FaFileArchive } from "react-icons/fa";



export const ObjectTypes = {
    SYNBIOHUB: {
        id: "synbio.object-type.synbiohub",
        title: "SynBioHub Repository",
        listTitle: "SynBioHub Repositories",
        icon: RiGitRepositoryLine,
        isRepository: true,
    },
    Resources: {
        id: "synbio.object-type.resources",
        title: "Resources",
        listTitle: "Resources",
        fileNameMatch: /\.json$/,
        icon: FaFileArchive,
        createable: false,
        importable: true,
        extension: '.json',
        subdirectory: "resources",
        downloadable: true,
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
        importable: true,
        iframeImport: true,
        iframeUrl: "https://seqimprove.synbiohub.org/",
        extension: '.xml',
        icon: TbComponents,
        fileNameMatch: /\.xml$/,
        badgeLabel: "PLASMID",
        subdirectory: "plasmids"
    },
    Strains: {
        id: "synbio.object-type.strains",
        title: "Strains",
        listTitle: "Strains",
        fileNameMatch: /\.(xlsm|xlsx)$/,
        icon: MdAlignVerticalTop,
        extension: '.json',
        createable: false,
        importable: true,
        subdirectory: "strains",
        downloadable: true,
    },
    Assembly: {
        id: "synbio.object-type.assembly-plan",
        title: "Assembly Plan",
        listTitle: "Assembly Plans",
        fileNameMatch: /\.json$/,
        icon: GiThorHammer,
        createable: true,
        extension: '.json',
        subdirectory: "assemblyPlans"
    },
    Transformations: {
        id: "synbio.object-type.transformations",
        title: "Transformations",
        listTitle: "Transformations",
        fileNameMatch: /\.json$/,
        icon: GiSewingMachine,
        createable: true,
        extension: '.json',
        subdirectory: "transformations"
    },
    SampleDesigns: {
        id: "synbio.object-type.sample-designs",
        title: "Sample Designs",
        listTitle: "Sample Designs",
        fileNameMatch: /\.(xlsm|xlsx)$/,
        icon: MdAlignVerticalTop,
        extension: '.json',
        createable: false,
        importable: true,
        subdirectory: "sampleDesigns",
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
        subdirectory: "experimentalSetups",
        downloadable: true,
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
    PlateReader: {
        id: "synbio.object-type.plate-reader",
        title: "Plate Reader Output",
        listTitle: "Plate Reader Output",
        fileNameMatch: /\.(xlsm|xlsx)$/,
        icon: VscOutput,
        createable: false,
        importable: true,
        subdirectory: "plateReaderOutputs",
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
    Flapjack: {
        id: "synbio.object-type.flapjack",
        title: "Flapjack Repository",
        listTitle: "Flapjack Repositories",
        icon: RiGitRepositoryLine,
        isRepository: true,
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
    if (file.isDirectory || file.type === 'directory') {
        return null;
    }

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
