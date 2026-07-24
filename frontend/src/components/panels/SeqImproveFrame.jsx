import { LoadingOverlay, Progress } from '@mantine/core'
import { showNotification } from '@mantine/notifications'
import { useState, useEffect, useRef, useContext } from 'react'
import { PanelContext } from './SeqImprovePanel'
import { usePanelProperty } from '../../redux/hooks/panelsHooks'
import store from '../../redux/store'
import { createFileInDirectory, writeToFileHandle } from '../../redux/hooks/workingDirectoryHooks'
import { ObjectTypes } from '../../objectTypes'
import { useSelector } from "react-redux";


export default function SeqImproveFrame({ fileTypeObjectId }) {
    const { url, panelId } = useContext(PanelContext)
    const [sbolContent, setSBOLContent] = usePanelProperty(panelId, 'sbol', false)
    const subdirectory = useSelector(state => state.panels.entities[panelId]?.subdirectory)
 
    const iframeRef = useRef()

    const [iframeLoaded, setIFrameLoaded] = useState(false)
    const [sbolContentLoaded, setSbolContentLoaded] = useState(!sbolContent)
    const loadProgress = 10 + (iframeLoaded + sbolContentLoaded) * 45

    const targetOrigin = (() => {
        try { return new URL(url).origin } catch { return '*' }
    })()

    const messageListener = ({ data, source }) => {
        if (source !== iframeRef.current?.contentWindow) return
        if (data === 'graphServiceLoadedSBOL') {
            setSbolContentLoaded(true)
            return
        }
        if (data?.sbol) {
            console.debug('Received SBOL from SeqImprove:', data.sbol.substring(0, 100))
            setSBOLContent(data.sbol)

            if (data.source === 'seqimprove') {
                ;(async () => {
                    try {
                        const workDir = store.getState().workingDirectory.directoryHandle
                        if (!workDir) {
                            showNotification({ title: 'Save failed', message: 'No working directory selected', color: 'red' })
                            return
                        }

                        const safeName = data.displayID + '.xml'
                        const plasmidsSubdir = subdirectory
                        const plasmidsDir = await workDir.getDirectoryHandle(plasmidsSubdir, { create: true })
                        const fileHandle = await createFileInDirectory(
                            plasmidsDir,
                            safeName,
                            subdirectory=='plasmids'?ObjectTypes.Plasmids.id:ObjectTypes.Devices.id,
                            store.dispatch,
                            plasmidsSubdir,
                        )
                        await writeToFileHandle(fileHandle, data.sbol)
                        showNotification({ title: 'Saved to working directory', message: `${plasmidsSubdir}/${safeName}`, color: 'teal' })
                    }
                    catch (err) {
                        showNotification({ title: 'Save failed', message: err?.message ?? String(err), color: 'red' })
                    }
                })()
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
