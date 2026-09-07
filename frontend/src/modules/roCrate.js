import JSZip from 'jszip'

const RO_CRATE_VERSION = 'https://w3id.org/ro/crate/1.2'
const COMBINE_FORMAT = 'http://identifiers.org/combine.specifications/'
const MEDIA_TYPE_FORMAT = 'http://purl.org/NET/mediatypes/'
const DATA_LICENSE_FILE = 'DATA_LICENSE.md'
const CC_BY_4_0 = {
    id: 'https://creativecommons.org/licenses/by/4.0/',
    name: 'Creative Commons Attribution 4.0 International',
    description: 'Permits sharing and adaptation for any purpose, provided appropriate credit is given.',
}
const DEFAULT_DATA_LICENSE_NOTICE = `# Data License

Unless otherwise noted, the contents of this exported study dataset are licensed under the [Creative Commons Attribution 4.0 International license](${CC_BY_4_0.id}).

This license applies to the dataset contents, not to SynBioSuite software, which is licensed separately under the Apache License 2.0.
`
const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini'])
const INTERNAL_JSON_DIRECTORIES = new Set(['resources', 'strains', 'sampleDesigns'])

async function withErrorContext(context, operation) {
    try {
        return await operation()
    } catch (error) {
        throw new Error(`${context}:\n${error?.message || 'An unexpected error occurred'}`)
    }
}

function shouldIgnore(name, path) {
    return IGNORED_FILES.has(name) || name.startsWith('._') ||
        (!path && (name === 'study.json' || name === 'assays.json' || name === 'ro-crate-metadata.json' || name === 'manifest.xml')) ||
        (INTERNAL_JSON_DIRECTORIES.has(path) && name.toLowerCase().endsWith('.json'))
}

function encodePath(path) {
    return path.split('/').map(encodeURIComponent).join('/')
}

async function getOmexFormat(path, file) {
    const extension = path.toLowerCase().match(/\.[^.\/]+$/)?.[0] || ''
    const reportedMediaType = String(file.type || '').split(';', 1)[0].trim().toLowerCase()
    const mediaType = reportedMediaType === 'text/xml' ? 'application/xml' : reportedMediaType
    const combineExtensions = {
        '.sbol': 'sbol',
        '.sbml': 'sbml',
        '.sedml': 'sed-ml',
        '.cellml': 'cellml',
        '.omex': 'omex',
        '.sbox': 'omex',
        '.sbex': 'omex',
        '.sedx': 'omex',
        '.cmex': 'omex',
    }
    if (combineExtensions[extension]) return `${COMBINE_FORMAT}${combineExtensions[extension]}`
    const combineMediaTypes = {
        'application/sbol+xml': 'sbol',
        'application/sbml+xml': 'sbml',
        'application/sedml+xml': 'sed-ml',
        'application/sed-ml+xml': 'sed-ml',
        'application/cellml+xml': 'cellml',
        'application/omex': 'omex',
    }
    if (combineMediaTypes[mediaType]) return `${COMBINE_FORMAT}${combineMediaTypes[mediaType]}`

    if (extension === '.xml') {
        const text = typeof file.text === 'function' ? await file.text() : new TextDecoder().decode(file)
        if (/https?:\/\/sbols\.org\/v\d+(?:\.\d+)?[#/]/i.test(text)) return `${COMBINE_FORMAT}sbol`
        if (/https?:\/\/(?:www\.)?sbml\.org\/sbml\//i.test(text)) return `${COMBINE_FORMAT}sbml`
        if (/https?:\/\/sed-ml\.org\/sed-ml\//i.test(text)) return `${COMBINE_FORMAT}sed-ml`
        if (/https?:\/\/(?:www\.)?cellml\.org\/cellml\//i.test(text)) return `${COMBINE_FORMAT}cellml`
    }

    const extensionTypes = {
        '.csv': 'text/csv',
        '.html': 'text/html',
        '.json': 'application/json',
        '.jsonld': 'application/ld+json',
        '.md': 'text/markdown',
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.rdf': 'application/rdf+xml',
        '.svg': 'image/svg+xml',
        '.tsv': 'text/tab-separated-values',
        '.txt': 'text/plain',
        '.xml': 'application/xml',
        '.zip': 'application/zip',
    }
    return `${MEDIA_TYPE_FORMAT}${mediaType || extensionTypes[extension] || 'application/octet-stream'}`
}

async function createOmexManifest(files) {
    const contents = [
        { location: '.', format: `${COMBINE_FORMAT}omex` },
        { location: 'manifest.xml', format: `${COMBINE_FORMAT}omex-manifest` },
        { location: 'ro-crate-metadata.json', format: `${MEDIA_TYPE_FORMAT}application/ld+json` },
    ]
    const sortedFiles = [...files].sort((a, b) => a.path < b.path ? -1 : (a.path > b.path ? 1 : 0))
    for (const { path, file } of sortedFiles) {
        contents.push({ location: encodePath(path), format: await getOmexFormat(path, file) })
    }
    const entries = contents.map(({ location, format }) => (
        `  <content location="${location}" format="${format}"/>`
    )).join('\n')
    return `<?xml version="1.0" encoding="UTF-8"?>\n<omexManifest xmlns="${COMBINE_FORMAT}omex-manifest">\n${entries}\n</omexManifest>\n`
}

function isPreviewFile(path) {
    return path === 'ro-crate-preview.html' || path.startsWith('ro-crate-preview_files/')
}

function compactAssayWorkflow(workflow, filePath) {
    if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) {
        throw new Error(`Cannot export assay workflow "${filePath}": expected a JSON object.`)
    }
    const optionalReference = (value, field) => {
        if (value == null || value === '') return null
        if (typeof value !== 'string') {
            throw new Error(`Cannot export assay workflow "${filePath}": field "${field}" must be a file path.`)
        }
        return value
    }
    let results = workflow.results == null || workflow.results === '' ? [] : workflow.results
    if (!Array.isArray(results)) results = [results]
    if (results.some(value => typeof value !== 'string')) {
        throw new Error(`Cannot export assay workflow "${filePath}": field "results" must contain only file paths.`)
    }
    results = results.filter(Boolean)

    const compact = {
        metadata: optionalReference(workflow.metadata, 'metadata'),
        results,
        plateOutput: optionalReference(workflow.plateOutput, 'plateOutput'),
    }
    const references = [
        ...(compact.metadata ? [{ field: 'metadata', path: compact.metadata }] : []),
        ...compact.results.map(path => ({ field: 'results', path })),
        ...(compact.plateOutput ? [{ field: 'plateOutput', path: compact.plateOutput }] : []),
    ]
    return { compact, references }
}

async function addDirectory(zip, directoryHandle, path = '', files = [], assayWorkflows = []) {
    const directoryPath = path || directoryHandle.name || '.'
    const entries = await withErrorContext(`Could not read directory "${directoryPath}"`, async () => {
        const directoryEntries = []
        for await (const entry of directoryHandle.values()) directoryEntries.push(entry)
        return directoryEntries
    })
    entries.sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of entries) {
        const entryPath = path ? `${path}/${entry.name}` : entry.name
        if (entry.kind === 'directory') {
            await addDirectory(zip, entry, entryPath, files, assayWorkflows)
        } else if (!shouldIgnore(entry.name, path)) {
            const file = await withErrorContext(`Could not read file "${entryPath}"`, () => entry.getFile())
            if (entryPath.toLowerCase().endsWith('.xdc')) {
                const text = await withErrorContext(`Could not read file "${entryPath}"`, () => (
                    typeof file.text === 'function' ? file.text() : new TextDecoder().decode(file)
                ))
                const workflow = await withErrorContext(`Could not parse assay workflow "${entryPath}"`, () => JSON.parse(text))
                const { compact, references } = compactAssayWorkflow(workflow, entryPath)
                const workflowText = JSON.stringify(compact, null, 2)
                zip.file(entryPath, workflowText)
                files.push({
                    path: entryPath,
                    file: { name: entry.name, size: new TextEncoder().encode(workflowText).length, type: 'application/json' },
                })
                assayWorkflows.push({ path: entryPath, references })
            } else {
                zip.file(entryPath, file)
                files.push({ path: entryPath, file })
            }
        }
    }
    return files
}

function createMetadata(study, directoryName, files, exportedAt, hasCustomDataLicense) {
    const citations = (Array.isArray(study.citations) ? study.citations : [])
        .map(String).map(value => value.trim()).filter(Boolean)
    const citationEntities = citations.map(pmid => ({
        '@id': `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pmid)}/`,
        '@type': 'ScholarlyArticle',
        identifier: `PMID:${pmid}`,
        name: `PubMed record ${pmid}`,
    }))
    const payloadFiles = files.filter(({ path }) => !isPreviewFile(path))

    return {
        '@context': `${RO_CRATE_VERSION}/context`,
        '@graph': [
            {
                '@id': 'ro-crate-metadata.json',
                '@type': 'CreativeWork',
                conformsTo: { '@id': RO_CRATE_VERSION },
                about: { '@id': './' },
            },
            {
                '@id': './',
                '@type': 'Dataset',
                name: study.name || directoryName,
                description: study.description || study.name || directoryName,
                datePublished: exportedAt.toISOString(),
                identifier: study.collectionUri || study.id,
                version: study.version,
                license: {
                    '@id': hasCustomDataLicense ? DATA_LICENSE_FILE : CC_BY_4_0.id,
                },
                hasPart: payloadFiles.map(({ path }) => ({ '@id': encodePath(path) })),
                ...(citationEntities.length && {
                    citation: citationEntities.map(({ '@id': id }) => ({ '@id': id })),
                }),
            },
            ...payloadFiles.map(({ path, file }) => {
                const mediaType = String(file.type || '').split(';', 1)[0].trim().toLowerCase()
                const encodingFormat = path.toLowerCase().endsWith('.xml') && (!mediaType || mediaType === 'text/xml')
                    ? 'application/xml'
                    : file.type
                return {
                    '@id': encodePath(path),
                    '@type': 'File',
                    name: file.name,
                    contentSize: String(file.size),
                    ...(encodingFormat && { encodingFormat }),
                }
            }),
            ...citationEntities,
            ...(!hasCustomDataLicense ? [{
                '@id': CC_BY_4_0.id,
                '@type': 'CreativeWork',
                name: CC_BY_4_0.name,
                description: CC_BY_4_0.description,
            }] : []),
        ],
    }
}

export async function buildStudyRoCrate(directoryHandle, study, exportedAt = new Date()) {
    const zip = new JSZip()
    const assayWorkflows = []
    const files = await addDirectory(zip, directoryHandle, '', [], assayWorkflows)
    const exportedPaths = new Set(files.map(({ path }) => path))
    for (const workflow of assayWorkflows) {
        for (const reference of workflow.references) {
            if (!exportedPaths.has(reference.path)) {
                throw new Error(`Cannot export assay workflow "${workflow.path}": field "${reference.field}" references missing file "${reference.path}".`)
            }
        }
    }
    const hasCustomDataLicense = files.some(({ path }) => path === DATA_LICENSE_FILE)
    if (!hasCustomDataLicense) {
        zip.file(DATA_LICENSE_FILE, DEFAULT_DATA_LICENSE_NOTICE)
        files.push({
            path: DATA_LICENSE_FILE,
            file: {
                name: DATA_LICENSE_FILE,
                size: new TextEncoder().encode(DEFAULT_DATA_LICENSE_NOTICE).length,
                type: 'text/markdown',
            },
        })
    }
    const metadata = createMetadata(study, directoryHandle.name, files, exportedAt, hasCustomDataLicense)
    zip.file('ro-crate-metadata.json', JSON.stringify(metadata, null, 2))
    zip.file('manifest.xml', await createOmexManifest(files))

    const fallbackName = study.id || directoryHandle.name || 'study'
    const safeName = String(fallbackName).trim().replace(/[\\/:*?"<>|]+/g, '_') || 'study'
    return {
        blob: await withErrorContext('Could not create ZIP archive', () => (
            zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
        )),
        fileName: `${safeName}-ro-crate.omex`,
        licenseLabel: hasCustomDataLicense ? 'Custom terms in DATA_LICENSE.md' : 'CC BY 4.0',
    }
}
