import { BiWorld } from "react-icons/bi"
import { IoAnalyticsSharp } from "react-icons/io5"
import { TbComponents } from "react-icons/tb"
import { GrTestDesktop } from "react-icons/gr";
import { MdAlignVerticalTop } from "react-icons/md";
import { VscOutput } from "react-icons/vsc";



export const ObjectTypes = {
    SBOL: {
        id: "synbio.object-type.sbol",
        title: "SBOL Component",
        listTitle: "SBOL Components",
        fileMatch: /<sbol:/,
        icon: TbComponents,
        createable: true,
        uploadable: false,
        extension: '.xml',
        badgeLabel: "SBOL",
    },
    SBML: {
        id: "synbio.object-type.sbml",
        title: "SBML File",
        listTitle: "SBML Files",
        fileMatch: /<sbml/,
        createable: false,
        uploadable: false,
        badgeLabel: "SBML",
    },
    OMEX: {
        id: "synbio.object-type.omex-archive",
        title: "OMEX Archive",
        listTitle: "OMEX Archives",
        fileNameMatch: /\.omex$/,
        icon: BiWorld,
        createable: false,
        uploadable: false,
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
    Experiment: {
        id: "synbio.object-type.experiment",
        title: "Experiments",
        listTitle: "Experiments",
        fileNameMatch: /\.xdc/,
        icon: GrTestDesktop,
        createable: true,
        uploadable: false,
        extension: ".xdc",
    },
    Metadata: {
        id: "synbio.object-type.experimental-data",
        title: "Experimental Metadata",
        listTitle: "Experimental Metadata",
        fileNameMatch: /\.(xslm|xslx)$/,
        icon: MdAlignVerticalTop,
        createable: false,
        uploadable: true,
    },
    Output: {
        id: "synbio.object-type.output-data",
        title: "Plate Reader Outputs",
        listTitle: "Plate Reader Outputs",
        fileNameMatch: /\.(xslm|xslx)$/,
        icon: VscOutput,
        createable: false,
        uploadable: true,
    },
}

export function getObjectType(id) {
    return Object.values(ObjectTypes).find(ot => ot.id == id)
}

export async function classifyFile(file, subDirectoryName) {
    // try to match by file name
    const matchFromFileName = Object.values(ObjectTypes).find(
        ot => ot.fileNameMatch?.test(file.name)
    )?.id
    if (!subDirectoryName && matchFromFileName && matchFromFileName != ObjectTypes.Metadata.id && matchFromFileName != ObjectTypes.Output.id) {
        return matchFromFileName;
    } else if 
    (subDirectoryName != null && subDirectoryName.toLowerCase() === "output" && ObjectTypes.Output.fileNameMatch?.test(file.name)) {
        return ObjectTypes.Output.id;
    } else if (subDirectoryName != null && subDirectoryName.toLowerCase() === "metadata" && ObjectTypes.Metadata.fileNameMatch?.test(file.name)) {
        return ObjectTypes.Metadata.id;
    }

    // otherwise, read file content
    if(subDirectoryName != null){
        const fileContent = await (await file.getFile()).text()
        return Object.values(ObjectTypes).find(
            ot => ot.fileMatch?.test(fileContent)
        )?.id
    }
}