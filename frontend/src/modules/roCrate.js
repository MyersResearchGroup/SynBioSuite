import JSZip from 'jszip'

const RO_CRATE_VERSION = 'https://w3id.org/ro/crate/1.2'
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
const WORKFLOW_JSON_DIRECTORIES = new Set(['resources', 'strains', 'sampleDesigns'])

async function withErrorContext(context, operation) {
    try {
        return await operation()
    } catch (error) {
        throw new Error(`${context}:\n${error?.message || 'An unexpected error occurred'}`)
    }
}

function shouldIgnore(name, path) {
    return IGNORED_FILES.has(name) || name.startsWith('._') ||
        (!path && name === 'ro-crate-metadata.json')
}

function encodePath(path) {
    return path.split('/').map(encodeURIComponent).join('/')
}

function isPreviewFile(path) {
    return path === 'ro-crate-preview.html' || path.startsWith('ro-crate-preview_files/')
}

function getOwnedJsonType(path) {
    if (path.toLowerCase().endsWith('.xdc')) return 'assay workflow'
    if (path === 'study.json') return 'study metadata'

    const parts = path.split('/')
    if (parts.length === 2 && WORKFLOW_JSON_DIRECTORIES.has(parts[0]) && parts[1].toLowerCase().endsWith('.json')) {
        return 'workflow'
    }
    return null
}

function addAssay(assays, workflow, workflowDirectory) {
    if (!workflow.metadata) return
    const basePath = workflowDirectory.split('/').slice(0, -1).join('/')
    const resolvePath = value => basePath && value ? `${basePath}/${value}` : value
    const assay = {
        assayMetadata: resolvePath(workflow.metadata),
        experimentalData: (Array.isArray(workflow.results) ? workflow.results : (workflow.results ? [workflow.results] : [])).map(resolvePath),
        plateReaderData: (Array.isArray(workflow.plateOutput) ? workflow.plateOutput : (workflow.plateOutput ? [workflow.plateOutput] : [])).map(resolvePath),
    }
    assays.push(assay)
}

function sanitizeWorkflow(workflow, filePath) {
    const sanitized = JSON.parse(JSON.stringify(workflow))

    if (filePath === 'study.json') delete sanitized.userEmail
    if (sanitized.collection && typeof sanitized.collection === 'object') {
        delete sanitized.collection.authToken
        delete sanitized.collection.userEmail
    }
    if (Array.isArray(sanitized.uploads)) {
        for (const upload of sanitized.uploads) {
            if (upload && typeof upload === 'object') delete upload.userEmail
        }
    }

    const findSensitiveField = (value, path = []) => {
        if (!value || typeof value !== 'object') return null
        for (const [key, child] of Object.entries(value)) {
            const childPath = [...path, key]
            if (/token|password|secret|credential|refresh|email|username|affiliation/i.test(key) && child != null && child !== '') {
                return childPath.join('.')
            }
            const nested = findSensitiveField(child, childPath)
            if (nested) return nested
        }
        return null
    }

    const sensitiveField = findSensitiveField(sanitized)
    if (sensitiveField) {
        throw new Error(`Cannot export workflow "${filePath}": sensitive field "${sensitiveField}" contains a value. Remove the field value and retry.`)
    }
    return sanitized
}

async function addDirectory(zip, directoryHandle, path = '', files = [], assays = []) {
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
            await addDirectory(zip, entry, entryPath, files, assays)
        } else if (!shouldIgnore(entry.name, path)) {
            const file = await withErrorContext(`Could not read file "${entryPath}"`, () => entry.getFile())
            const ownedJsonType = getOwnedJsonType(entryPath)
            if (ownedJsonType) {
                const text = await withErrorContext(`Could not read file "${entryPath}"`, () => (
                    typeof file.text === 'function' ? file.text() : new TextDecoder().decode(file)
                ))
                const workflow = await withErrorContext(`Could not parse ${ownedJsonType} "${entryPath}"`, () => JSON.parse(text))
                if (ownedJsonType === 'assay workflow') addAssay(assays, workflow, path)
                const workflowText = JSON.stringify(sanitizeWorkflow(workflow, entryPath), null, 2)
                zip.file(entryPath, workflowText)
                files.push({
                    path: entryPath,
                    file: { name: entry.name, size: new TextEncoder().encode(workflowText).length, type: 'application/json' },
                })
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
            ...payloadFiles.map(({ path, file }) => ({
                '@id': encodePath(path),
                '@type': 'File',
                name: file.name,
                contentSize: String(file.size),
                ...(file.type && { encodingFormat: file.type }),
            })),
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
    const assays = []
    const files = await addDirectory(zip, directoryHandle, '', [], assays)
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
    if (assays.length) {
        const assayText = JSON.stringify({ version: 1, assays }, null, 2)
        zip.file('assays.json', assayText)
        files.push({
            path: 'assays.json',
            file: { name: 'assays.json', size: new TextEncoder().encode(assayText).length, type: 'application/json' },
        })
    }
    const metadata = createMetadata(study, directoryHandle.name, files, exportedAt, hasCustomDataLicense)
    zip.file('ro-crate-metadata.json', JSON.stringify(metadata, null, 2))

    const fallbackName = study.id || directoryHandle.name || 'study'
    const safeName = String(fallbackName).trim().replace(/[\\/:*?"<>|]+/g, '_') || 'study'
    return {
        blob: await withErrorContext('Could not create ZIP archive', () => (
            zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
        )),
        fileName: `${safeName}-ro-crate.zip`,
        licenseLabel: hasCustomDataLicense ? 'Custom terms in DATA_LICENSE.md' : 'CC BY 4.0',
    }
}
