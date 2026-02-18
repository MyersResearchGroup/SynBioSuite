
import { PanelContext } from "./SeqImprovePanel"
import { useContext } from "react"
import { useRef } from "react"

export default function SeqImproveFrame({}) {

    const url = useContext(PanelContext)
    // iframe reference
    const iframeRef = useRef()

    // loading states
    return (
        <>
                <div style={containerStyle}>
                    <iframe
                        src={url + '?ignoreHTTPErrors=true'}
                        style={iframeStyle}
                        width="100%"
                        height="100%"
                        loading="lazy"
                        ref={iframeRef}
                        title="SeqImprove"
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