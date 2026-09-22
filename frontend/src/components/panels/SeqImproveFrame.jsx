import { LoadingOverlay, Progress } from '@mantine/core'
import { showNotification } from '@mantine/notifications'
import { useState, useEffect, useRef, useContext } from 'react'
import { PanelContext } from './SeqImprovePanel'
import { usePanelProperty } from '../../redux/hooks/panelsHooks'
import store from '../../redux/store'
import { createFileInDirectory, writeToFileHandle } from '../../redux/hooks/workingDirectoryHooks'
import { ObjectTypes } from '../../objectTypes'

export default function SeqImproveFrame({ fileTypeObjectId }) {
    const { url, panelId } = useContext(PanelContext)
    const [sbolContent, setSBOLContent] = usePanelProperty(panelId, 'sbol', false)
 
    const iframeRef = useRef()
    const saveQueue = useRef(Promise.resolve())

    const [iframeLoaded, setIFrameLoaded] = useState(false)
    const [sbolContentLoaded, setSbolContentLoaded] = useState(!sbolContent)
    const loadProgress = 10 + (iframeLoaded + sbolContentLoaded) * 45

    const targetOrigin = (() => {
        try { return new URL(url).origin } catch { return '*' }
    })()

    const reply = message => iframeRef.current?.contentWindow?.postMessage(message, targetOrigin)

    const messageListener = ({ data, source }) => {
        if (source !== iframeRef.current?.contentWindow) return
        if (data === 'graphServiceLoadedSBOL') {
            setSbolContentLoaded(true)
            return
        }
        if (data?.type === 'checkFileName') {
            ;(async () => {
                try {
                    const { dir } = await getSaveDirectory(panelId)
                    const requested = cleanFileName(data.displayID)
                    const fileName = await getAvailableFileName(dir, requested)
                    reply({ type: 'fileNameSuggestion', requestId: data.requestId, requested, fileName, exists: fileName !== requested })
                }
                catch (err) {
                    const message = err?.message ?? String(err)
                    reply({ type: 'fileNameSuggestion', requestId: data.requestId, error: message })
                    showNotification({ title: 'Save failed', message, color: 'red' })
                }
            })()
            return
        }
        if (data?.sbol) {
            console.debug('Received SBOL from SeqImprove:', data.sbol.substring(0, 100))
            setSBOLContent(data.sbol)

            if (data.source === 'seqimprove') {
                // this app owns the save toasts; SeqImprove only uses the reply to stop its spinner
                // saves run one at a time so two quick saves can't both pick the same free name
                saveQueue.current = saveQueue.current.then(async () => {
                    try {
                        const { dir, subdir } = await getSaveDirectory(panelId)

                        // never overwrite an existing file. a name the user picked that has been taken
                        // since the check goes back to SeqImprove to re-prompt; older SeqImprove builds
                        // that only send a displayID get the next free _N name instead.
                        let baseName
                        if (data.fileName) {
                            baseName = cleanFileName(data.fileName)
                            if (await fileExists(dir, baseName + '.xml')) {
                                const suggestion = await getAvailableFileName(dir, baseName)
                                reply({ type: 'saveResult', requestId: data.requestId, ok: false, reason: 'exists', fileName: baseName, suggestion })
                                return
                            }
                        }
                        else {
                            baseName = await getAvailableFileName(dir, cleanFileName(data.displayID))
                        }
                        const safeName = baseName + '.xml'
                        const fileHandle = await createFileInDirectory(
                            dir,
                            safeName,
                            subdir === 'plasmids' ? ObjectTypes.Plasmids.id : ObjectTypes.Devices.id,
                            store.dispatch,
                            subdir,
                        )
                        await writeToFileHandle(fileHandle, data.sbol)
                        reply({ type: 'saveResult', requestId: data.requestId, ok: true, path: `${subdir}/${safeName}` })
                        showNotification({ title: 'Saved to working directory', message: `${subdir}/${safeName}`, color: 'teal' })
                    }
                    catch (err) {
                        const message = err?.message ?? String(err)
                        reply({ type: 'saveResult', requestId: data.requestId, ok: false, reason: 'error', message })
                        showNotification({ title: 'Save failed', message, color: 'red' })
                    }
                })
            }
            return
        }
        if (data?.error) {
            showNotification({
                title: 'SeqImprove error',
                message: data.error.message,
                color: 'red',
            })
        }
    }

    useEffect(() => {
        window.addEventListener('message', messageListener)
        return () => window.removeEventListener('message', messageListener)
    }, [])

    const handleIFrameLoad = () => {
        setIFrameLoaded(true)
        setSbolContentLoaded(!sbolContent)

        iframeRef.current.contentWindow.postMessage(
            sbolContent
                ? { sbol: sbolContent, panelType: fileTypeObjectId }
                : { panelType: fileTypeObjectId },
            targetOrigin,
        )
    }

    return (
        <div style={containerStyle}>
            <iframe
                src={url + '?ignoreHTTPErrors=true'}
                style={iframeStyle(sbolContentLoaded)}
                width="100%"
                height="100%"
                frameBorder="0"
                onLoad={handleIFrameLoad}
                loading="lazy"
                ref={iframeRef}
                title="SeqImprove"
            />
            {loadProgress < 100 && <>
                <Progress value={loadProgress} radius={0} size="md" styles={progressStyles} />
                <LoadingOverlay visible={true} overlayOpacity={0} />
            </>}
        </div>
    )
}

async function getSaveDirectory(panelId) {
    const workDir = store.getState().workingDirectory.directoryHandle
    if (!workDir)
        throw new Error('No working directory selected')

    const subdir = store.getState().panels.entities[panelId]?.subdirectory
    const dir = await workDir.getDirectoryHandle(subdir, { create: true })
    return { dir, subdir }
}

function cleanFileName(name) {
    const cleaned = String(name ?? '').trim().replace(/\.xml$/i, '')
    if (!cleaned || /[\\/:*?"<>|]/.test(cleaned) || cleaned === '.' || cleaned === '..')
        throw new Error(`"${name ?? ''}" is not a valid file name`)
    return cleaned
}

async function fileExists(dir, fileName) {
    try {
        await dir.getFileHandle(fileName)
        return true
    }
    catch (err) {
        if (err?.name === 'NotFoundError')
            return false
        // a folder with this name also counts as taken
        if (err?.name === 'TypeMismatchError')
            return true
        throw err
    }
}

// device1 -> device1 if free, otherwise device1_1, device1_2, ...
async function getAvailableFileName(dir, baseName, maxAttempts = 1000) {
    if (!await fileExists(dir, baseName + '.xml'))
        return baseName
    for (let i = 1; i <= maxAttempts; i++) {
        const candidate = `${baseName}_${i}`
        if (!await fileExists(dir, candidate + '.xml'))
            return candidate
    }
    throw new Error(`No free file name found for ${baseName}`)
}

const progressStyles = theme => ({
    root: { position: 'absolute', top: 0, width: '100%' },
    bar: { transition: 'width 0.3s' },
})

const iframeStyle = show => ({
    overflow: 'hidden',
    visibility: show ? 'visible' : 'hidden',
})

const containerStyle = {
    height: '94vh',
    overflowY: 'hidden',
    position: 'relative',
}
