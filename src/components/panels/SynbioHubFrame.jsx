
import { PanelContext } from "./SynBioHubPanel"
import { useContext } from "react"
import { useRef } from "react"

export default function SynBioHubFrame({}) {

    const panelId = useContext(PanelContext)
    // iframe reference
    const iframeRef = useRef()

    // loading states
    return (
        <>
                <div style={containerStyle}>
                    <iframe
                        src={panelId +'?ignoreHTTPErrors=true'}
                        style={iframeStyle}
                        width="100%"
                        height="100%"
                        loading="lazy"
                        ref={iframeRef}
                    />
                </div>
        </>
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