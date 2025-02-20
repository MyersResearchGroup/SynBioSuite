
import { PanelContext } from "./SynBioHubPanel"
import { useContext } from "react"
import { useRef } from "react"

export default function SynbioHubFrame({}) {

    const panelId = useContext(PanelContext)
    const expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    const regex = new RegExp(expression)
    const isURL = panelId.match(regex)
    // iframe reference
    const iframeRef = useRef()

    // loading states
    return (
        <>
            {isURL
                ?
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
                :
                <p>sad</p>

            }
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