
import { LoadingOverlay } from '@mantine/core'
import { useSetState } from '@mantine/hooks'
import { useState, useEffect, useRef, useContext } from 'react'
import { PanelContext } from './SBOLEditorPanel'


export default function CanvasFrame() {

    // error boundary for weird bug
    const panelContext = useContext(PanelContext)
    if (!panelContext)
        return <></>

    const [panel, usePanelState] = panelContext

    // state containing full SBOL content
    const [sbolContent, setSBOLContent] = usePanelState('sbol')

    useEffect(() => {
        console.log(sbolContent.substring(0,200))
    }, [sbolContent])

    // iframe reference
    const iframeRef = useRef()

    // loading states
    const [iframeLoading, setIFrameLoading] = useState(true)
    const [showLoadingIcon, setShowLoadingIcon] = useState(true)

    // Handle incoming messages from iframe
    const messageListener = ({ data }) => {

        // Handle simple string messages
        if (typeof data === 'string') {
            switch (data) {
                case 'graphServiceLoadedSBOL':
                    setShowLoadingIcon(false)
                    break
                default:
                    break
            }
        }
        // handle messages with more data
        else {
            if (data?.sbol) {
                console.debug('Received SBOL from child:', data.sbol.substring(0,100))
                setSBOLContent(data.sbol)
            }
        }
    }

    // On mount
    useEffect(() => {
        window.addEventListener('message', messageListener)
        return () => window.removeEventListener('message', messageListener)
    }, [])

    // On iframe load or project change
    useEffect(() => {
        // check if iframe and project are both loaded
        if (!iframeLoading) {
            // if project has SBOL content, send it
            // otherwise, send dummy message - need this so SBOLCanvas knows
            // its embedded
            iframeRef.current.contentWindow.postMessage(
                sbolContent ?
                    { sbol: sbolContent } :
                    'you are embedded!',
                import.meta.env.VITE_SBOL_CANVAS_URL
            )

            // if project doesn't have SBOL content, don't wait up
            !sbolContent && setShowLoadingIcon(false)
        }
    }, [iframeLoading])


    return (
        <div style={containerStyle}>
            <LoadingOverlay visible={showLoadingIcon} />
            <iframe
                src={import.meta.env.VITE_SBOL_CANVAS_URL + '?ignoreHTTPErrors=true'}
                style={{ overflow: 'hidden' }}
                scrolling='no'
                width="100%"
                height="100%"
                frameBorder="0"
                onLoad={() => setIFrameLoading(false)}
                loading="lazy"
                ref={iframeRef}
            />
        </div>
    )
}

const containerStyle = {
    height: '94vh',
    overflowY: 'hidden'
}