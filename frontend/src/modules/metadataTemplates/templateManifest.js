export const SBOL = Object.freeze({
    namespace: 'http://sbols.org/v2#',
    moduleDefinition: 'http://sbols.org/v2#ModuleDefinition',
    componentDefinition: 'http://sbols.org/v2#ComponentDefinition',
    smallMolecule: 'http://www.biopax.org/release/biopax-level3.owl#SmallMolecule',
});

export const ONTOLOGY = Object.freeze({
    engineeredPlasmid: 'http://identifiers.org/so/SO:0000637',
    engineeredStrain: 'http://purl.obolibrary.org/obo/NCIT_C97158',
    medium: 'http://identifiers.org/ncit/NCIT:C48164',
    sampleDesign: 'https://wiki.synbiohub.org/wiki/Terms/SynBioSuite#SampleDesign',
});

const RAW = 'https://raw.github.com/SynBioDex/Excel-to-SBOL/master/resources/templates';

export const METADATA_TEMPLATE_MANIFEST = Object.freeze({
    'synbio.object-type.strains': {
        templateUrl: `${RAW}/Strains.xlsm`,
        filename: 'Strain.xlsm',
        populations: [
            // Deliberately follows the proven, externally specified mapping.
            { sheetName: 'SBH_chassis_collections', tableName: 'SBH_chassis_collections', role: ONTOLOGY.engineeredPlasmid },
            { sheetName: 'SBH_plasmids_collections', tableName: 'SBH_plasmids_collections', role: ONTOLOGY.engineeredPlasmid },
        ],
    },
    'synbio.object-type.sample-designs': {
        templateUrl: `${RAW}/SampleDesign.xlsm`,
        filename: 'SampleDesign.xlsm',
        populations: [
            { sheetName: 'SBH_strains_collection', tableName: 'SBH_strains_collection', role: ONTOLOGY.engineeredStrain, rdfType: SBOL.moduleDefinition },
            { sheetName: 'SBH_media_collection', tableName: 'SBH_media_collection', role: ONTOLOGY.medium, rdfType: SBOL.moduleDefinition },
            { sheetName: 'SBH_chemicals_collection', tableName: 'SBH_chemicals_collection', sbolType: SBOL.smallMolecule, rdfType: SBOL.componentDefinition },
        ],
    },
    'synbio.object-type.resources': {
        templateUrl: `${RAW}/Resources.xlsm`,
        filename: 'Resources.xlsm',
        populations: [],
    },
    // Study.xlsm no longer exists upstream. The selected current replacement is Assay.xlsm.
    'synbio.object-type.study-data': {
        templateUrl: `${RAW}/Assay.xlsm`,
        filename: 'Assay.xlsm',
        populations: [
            { sheetName: 'SBH_sampledesigns_collection', tableName: 'SBH_sampledesigns_collection', role: ONTOLOGY.sampleDesign, rdfType: SBOL.moduleDefinition },
        ],
    },
});

export function getMetadataTemplate(objectTypeId) {
    return METADATA_TEMPLATE_MANIFEST[objectTypeId] || null;
}

export function normalizeOptionalIri(value) {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized === '' || normalized.toLowerCase() === 'any' ? null : normalized;
}

export function getQueryCacheKey(population) {
    return JSON.stringify({
        role: normalizeOptionalIri(population.role),
        sbolType: normalizeOptionalIri(population.sbolType),
        rdfType: normalizeOptionalIri(population.rdfType),
    });
}
