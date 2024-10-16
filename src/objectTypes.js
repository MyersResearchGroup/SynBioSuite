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
        title: "Experiment File",
        listTitle: "Experiment Files",
        fileNameMatch: /\.xlsx$/,
        icon: GrTestDesktop,
        createable: true,
        uploadable: false,
        extension: ".xlsx",
    },
    XDC: {
        id: "synbio.object-type.experimental-data",
        title: "Experimental Metadata",
        listTitle: "Experimental Metadata",
        fileNameMatch: /\.experimental/,
        icon: MdAlignVerticalTop,
        createable: false,
        uploadable: true,
        extension: '.experimental'
    },
    Output: {
        id: "synbio.object-type.output-data",
        title: "Plate Reader Outputs",
        listTitle: "Plate Reader Outputs",
        fileNameMatch: /\.output/,
        icon: VscOutput,
        createable: false,
        uploadable: true,
        extension: '.output'
    },
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