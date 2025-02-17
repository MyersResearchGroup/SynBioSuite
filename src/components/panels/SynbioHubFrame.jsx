
import { PanelContext } from "./SynbioHubPanel"
import { useContext } from "react"
import { useRef } from "react"

export default function SynbioHubFrame({fileTypeObjectId}) {

    const panelId = useContext(PanelContext)

    // iframe reference
    const iframeRef = useRef()

    // loading states
    return (
        <div style={containerStyle}>
            <iframe
                src={import.meta.env.VITE_SBOL_CANVAS_URL + '?ignoreHTTPErrors=true'}
                style={iframeStyle}
                scrolling='no'
                width="100%"
                height="100%"
                frameBorder="0"
                loading="lazy"
                ref={iframeRef}
            />
        </div>
    )
}

const iframeStyle  = ({
    overflow: "hidden",
    visibility: "visible"
})

const containerStyle = {
    height: '94vh',
    overflowY: 'hidden',
    position: 'relative',
}