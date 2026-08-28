import { BiSpreadsheet } from "react-icons/bi"
import { IoAnalyticsSharp } from "react-icons/io5"
import { TbComponents } from "react-icons/tb"
import { PiTreeStructureFill } from "react-icons/pi"
import { GiSewingMachine } from "react-icons/gi"
import { GiThorHammer} from "react-icons/gi"
import { AiOutlineExperiment } from "react-icons/ai";
import { MdOutlineViewModule } from "react-icons/md";
import { VscOutput, VscGraphLine } from "react-icons/vsc";
import { FaDna } from "react-icons/fa";
import { FiDatabase, FiArchive } from "react-icons/fi";

const SEQ_IMPROVE_LINK = import.meta.env.VITE_SEQIMPROVE_URL

export const BLANK_SBOL = `<?xml version="1.0" ?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:sbol="http://sbols.org/v2#" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:prov="http://www.w3.org/ns/prov#" xmlns:om="http://www.ontology-of-units-of-measure.org/resource/om-2/" xmlns:SBOLCanvas="https://sbolcanvas.org/">
<sbol:ModuleDefinition rdf:about="https://sbolcanvas.org/module1">
    <sbol:persistentIdentity rdf:resource="https://sbolcanvas.org/module1"/>
    <sbol:displayId>module1</sbol:displayId>
</sbol:ModuleDefinition>
<SBOLCanvas:Layout rdf:about="https://sbolcanvas.org/module1_Layout">
    <sbol:persistentIdentity rdf:resource="https://sbolcanvas.org/module1_Layout"/>
    <sbol:displayId>module1_Layout</sbol:displayId>
    <SBOLCanvas:objectRef rdf:resource="https://sbolcanvas.org/module1"/>
</SBOLCanvas:Layout>
</rdf:RDF>`

export const BLANK_SBML = `<?xml version="1.0" encoding="UTF-8"?>
<sbml xmlns="http://www.sbml.org/sbml/level3/version2/core" level="3" version="2">
  <model id="sbolcanvas_model">
    <listOfCompartments>
      <compartment id="Cell" constant="true"/>
    </listOfCompartments>
  </model>
</sbml>`

export const ObjectTypes = {
    SYNBIOHUB: {
        id: "synbio.object-type.synbiohub",
        title: "Repository",
        listTitle: "SynBioHub Repositories",
        icon: FiDatabase,
        isRepository: true,
    },
    Resources: {
        id: "synbio.object-type.resources",
        title: "Resources",
        listTitle: "Resources",
        fileNameMatch: /\.(xlsm|xlsx)$/,
        icon: BiSpreadsheet,
        iframeUrl: SEQ_IMPROVE_LINK,
        createable: false,
        importable: true,
        uploadable: true,
        updateable: true,
        annotatable: false,
        extension: '.json',
        subdirectory: "resources",
        downloadable: true,
    },
     Devices: {
        id: "synbio.object-type.devices",
        title: "Device",
        listTitle: "Devices",
        fileMatch: /<sbol:/,
        fileNameMatch: /\.xml$/,
        icon: FaDna,
        iframeUrl: SEQ_IMPROVE_LINK,
        createable: true,
        importable: true,
        uploadable: true,
        annotatable: true,
        extension: '.xml',
        subdirectory: "devices",
    },   
    SBOL: {
        id: "synbio.object-type.sbol",
        title: "Design",
        listTitle: "Designs",
        fileMatch: /<sbol:/,
        fileNameMatch: /\_sbol.xml$/,
        icon: MdOutlineViewModule,
        createable: true,
        importable: true,
        uploadable: true,
        extension: '.xml',
        badgeLabel: "SBOL",
    },
    SBML: {
        id: "synbio.object-type.sbml",
        title: "Model",
        listTitle: "Models",
        fileMatch: /<sbml/,
        fileNameMatch: /\_sbml.xml$/,
        icon: PiTreeStructureFill,
        importable: true,
        uploadable: false,
        badgeLabel: "SBML",
    },
    OMEX: {
        id: "synbio.object-type.omex-archive",
        title: "Archive",
        listTitle: "Archives",
        fileNameMatch: /\.omex$/,
        icon: FiArchive,
        importable: true,
        uploadable: false,
        badgeLabel: "OMEX",
    },
    Analysis: {
        id: "synbio.object-type.analysis",
        title: "Analysis",
        listTitle: "Analyses",
        fileNameMatch: /\.analysis$/,
        icon: VscGraphLine,
        createable: true,
        uploadable: false,
        extension: '.analysis',
    },
    Plasmids: {
        id: "synbio.object-type.plasmid",
        title: "Plasmid",
        listTitle: "Plasmids",
        annotatable: true,
        createable: true,
        importable: true,
        uploadable: true,
        iframeImport: true,
        iframeUrl: SEQ_IMPROVE_LINK,
        extension: '.xml',
        icon: FaDna,
        fileMatch: /<sbol:/,
        fileNameMatch: /\.xml$/,
        badgeLabel: "PLASMID",
        subdirectory: "plasmids"
    },
    Strains: {
        id: "synbio.object-type.strains",
        title: "Strains",
        listTitle: "Strains",
        fileNameMatch: /\.(xlsm|xlsx)$/,
        icon: BiSpreadsheet,
        extension: '.json',
        createable: false,
        importable: true,
        uploadable: true,
        updateable: true,
        subdirectory: "strains",
        downloadable: true,
    },
    /*
    BuildPlans: {
        id: "synbio.object-type.buildplans",
        title: "Build Plans",
        listTitle: "Build Plans",
        fileNameMatch: /\.json$/,
        icon: GiSewingMachine,
        createable: true,
        extension: '.json',
        subdirectory: "buildPlans",
        visible: false
    },
    */
    SampleDesigns: {
        id: "synbio.object-type.sample-designs",
        title: "Sample Designs",
        listTitle: "Sample Designs",
        fileNameMatch: /\.(xlsm|xlsx)$/,
        icon: BiSpreadsheet,
        extension: '.json',
        createable: false,
        importable: true,
        uploadable: true,
        updateable: true,
        subdirectory: "sampleDesigns",
        downloadable: true,
    },
    Metadata: {
        id: "synbio.object-type.study-data",
        title: "Metadata",
        listTitle: "Assays",
        fileNameMatch: /\.(xlsm|xlsx)$/,
        icon: BiSpreadsheet,
        createable: false,
        importable: true,
        subdirectory: "assays",
        downloadable: true,
    },
    PlateReader: {
        id: "synbio.object-type.plate-reader",
        title: "Plate Reader Output",
        listTitle: "Plate Reader Outputs",
        fileNameMatch: /\.(xlsm|xlsx|txt|csv)$/,
        icon: VscOutput,
        createable: false,
        importable: true,
        subdirectory: "plateReaderOutputs",
    },
    Results: {
        id: "synbio.object-type.experimental-results",
        title: "Experimental Results",
        listTitle: "Other Experimental Results",
        fileNameMatch: /.*/,
        icon: VscOutput,
        createable: false,
        importable: true,
        subdirectory: "experimentalResults",
    },
    Flapjack: {
        id: "synbio.object-type.flapjack",
        title: "Repository",
        listTitle: "Flapjack Repositories",
        icon: FiDatabase,
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
        const matchFromSubdirectory = getOBjectBySubdirectory(subDirectoryName)
        if (matchFromSubdirectory?.fileNameMatch?.test(file.name)) {
            return matchFromSubdirectory.id
        }
        return null
    }
}
