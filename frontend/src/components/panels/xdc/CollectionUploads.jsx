import { Container, ScrollArea, Space } from '@mantine/core'
import { useContext } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { PanelContext } from './CollectionPanel'

export default function CollectionUploads() {
    const panelId = useContext(PanelContext)
    const [uploads] = usePanelProperty(panelId, 'uploads', false, [])

    return (
        <Container style={stepperContainerStyle}>
            <Space h="md" />
            <ScrollArea h={600} type="always">
                {(uploads?.length ?? 0) === 0 ? (
                    <div>No uploads yet.</div>
                ) : (
                    [...uploads].reverse().map((upload, idx) => {
                        const isNewest = idx === 0

                        return (
                            <div key={`${upload.uri || upload.file || idx}`} style={{ marginBottom: 16, padding: 8, border: '1px solid #eee', borderRadius: 4 }}>
                                <div style={{ marginBottom: 4 }}>
                                    <strong style={{ color: isNewest ? undefined : '#cf740d' }}>
                                        {isNewest ? 'Uploaded' : 'Upload of Older Version'}
                                    </strong>
                                </div>
                                <div>
                                    <strong>Collection Name: </strong>{upload.collectionName}
                                </div>
                                <div>
                                    <strong>Collection URL: </strong><a href={upload.uri} target="_blank" rel="noopener noreferrer">{upload.uri}</a>
                                </div>
                                <div>
                                    <strong>Date Uploaded: </strong>{upload.date}
                                </div>
                                <div>
                                    <strong>File: </strong>{upload.file}
                                </div>
                            </div>
                        )
                    })
                )}
            </ScrollArea>
        </Container>
    )
}

const stepperContainerStyle = {
    marginTop: 40,
    padding: '0 40px',
    flexDirection: 'column'
}