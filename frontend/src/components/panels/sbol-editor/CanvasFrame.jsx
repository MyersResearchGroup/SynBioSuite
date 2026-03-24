
import { Loader, LoadingOverlay, Progress } from '@mantine/core'
import { showNotification } from '@mantine/notifications'
import { useState, useEffect, useRef, useContext } from 'react'
import { PanelContext } from './SBOLEditorPanel'
import { usePanelProperty } from "../../../redux/hooks/panelsHooks"

const expectedOrigin = new URL(import.meta.env.VITE_SBOL_CANVAS_URL).origin


export default function CanvasFrame({fileTypeObjectId}) {

    const panelId = useContext(PanelContext)
    // state containing full SBOL content
    const [sbolContent, setSBOLContent] = usePanelProperty(panelId, "sbol", false)
    const [, setSBMLContent] = usePanelProperty(panelId, "sbml", false)

    // iframe reference
    const iframeRef = useRef()

    // loading states
    const [iframeLoaded, setIFrameLoaded] = useState(false)
    const [sbolContentLoaded, setSbolContentLoaded] = useState(!sbolContent)
    const loadProgress = 10 + (iframeLoaded + sbolContentLoaded) * 45

    // handle incoming messages from iframe
    const messageListener = ({ data, origin }) => {
        if (origin !== expectedOrigin) return

        // handle simple string messages
        switch (data) {
            case 'graphServiceLoadedSBOL':
                setSbolContentLoaded(true)
                return
        }

        // handle object payloads
        if (data?.sbol) {
            console.debug('Received SBOL from child:', data.sbol.substring(0, 100))
            setSBOLContent(data.sbol)
        }

        if (data?.sbml) {
            console.debug('Received SBML from child:', data.sbml.substring(0, 100))
            setSBMLContent(data.sbml)
        }

        if (data?.error) {
            console.error('SBOLCanvas error:', data.error)
            showNotification({
                title: 'SBOLCanvas Export Error',
                message: data.error.message || 'An unknown export error occurred.',
                color: 'red',
            })
        }
    }

    // Add message listener on mount
    useEffect(() => {
        window.addEventListener('message', messageListener)
        return () => window.removeEventListener('message', messageListener)
    }, [])

    // handle iframe load
    const handleIFrameLoad = () => {
        setIFrameLoaded(true)
        setSbolContentLoaded(!sbolContent) // skip loading SBOL if there's no SBOL

        // post message
        iframeRef.current.contentWindow.postMessage(
            
            sbolContent ?
                { sbol: sbolContent, panelType: fileTypeObjectId} : // either send SBOL content
                {panelType: fileTypeObjectId},         // if no sbolContent, just send in panel type
            import.meta.env.VITE_SBOL_CANVAS_URL
        )
    }

    return (
        <div style={containerStyle}>
            <iframe
                src={import.meta.env.VITE_SBOL_CANVAS_URL + '?ignoreHTTPErrors=true'}
                style={iframeStyle(sbolContentLoaded)}
                scrolling='no'
                width="100%"
                height="100%"
                frameBorder="0"
                onLoad={handleIFrameLoad}
                loading="lazy"
                ref={iframeRef}
            />
            {loadProgress < 100 && <>
                <Progress value={loadProgress} radius={0} size="md" styles={progressStyles} />
                <LoadingOverlay visible={true} overlayOpacity={0} />
            </>}
        </div>
    )
}

const progressStyles = theme => ({
    root: {
        position: "absolute",
        top: 0,
        width: "100%",
    },
    bar: {
        transition: "width 0.3s",
    },
})

const iframeStyle = show => ({
    overflow: "hidden",
    visibility: show ? "visible" : "hidden",
})

const containerStyle = {
    height: '94vh',
    overflowY: 'hidden',
    position: 'relative',
}