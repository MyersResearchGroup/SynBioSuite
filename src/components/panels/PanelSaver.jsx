import { usePanel, usePanelType } from '../../redux/slices/panelsSlice'
import { useDebouncedValue } from '@mantine/hooks'
import { useEffect, useState } from 'react'
import { useRef } from 'react'

const SAVE_DEBOUNCE = 2000

export default function PanelSaver({ id }) {

    const panel = usePanel(id)
    const panelType = usePanelType(id)
    const [serialized, setSerialized] = useState(() => panelType?.serialize?.(panel))
    
    const serializedRef = useRef()      // ref to keep track of current value
    serializedRef.current = serialized

    // serialize panel when it changes
    useEffect(() => {
        panel && setSerialized(panelType?.serialize?.(panel))
    }, [panel])

    // debounce serialized content
    const [debouncedPanelContent] = useDebouncedValue(serialized, SAVE_DEBOUNCE)

    // write when serialized content changes & unmount
    useEffect(() => () => {
        console.debug("Saving panel...")
        writeToFile(panel.fileHandle, serializedRef.current).then(() => {
            console.debug("Saved panel:", panel.fileHandle.name)
        })
    }, [debouncedPanelContent])

    return <></>
}

async function writeToFile(fileHandle, content) {
    // create write stream
    const writableStream = await fileHandle.createWritable()

    // write panel content
    await writableStream.write(content)

    // close stream
    await writableStream.close()
}