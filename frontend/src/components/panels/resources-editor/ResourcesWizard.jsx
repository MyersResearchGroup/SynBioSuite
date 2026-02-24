import { Container, Button, Space, ScrollArea } from "@mantine/core"
import { useContext } from 'react'
import { usePanelProperty } from "../../../redux/hooks/panelsHooks"
import { PanelContext } from './ResourcesPanel'
import PanelSaver from '../PanelSaver'
import { showErrorNotification } from "../../../modules/util"
import { useUnifiedModal } from '../../../redux/hooks/useUnifiedModal'
import { upload_resource } from "../../../API"
import { useWorkingDirectory } from '../../../redux/hooks/workingDirectoryHooks'


export default function ResourcesWizard() {
    const panelId = useContext(PanelContext)
    PanelSaver(panelId)

    const { workflows } = useUnifiedModal()
    const [workingDirectory] = useWorkingDirectory()

    const [file, setFile] = usePanelProperty(panelId, 'file', false)

    const [uploads, setUploads] = usePanelProperty(panelId, 'uploads', false, [])

    return (
        <Container style={stepperContainerStyle}>
            <Space h="md" />
            <ScrollArea h={600} type="always">
                {(uploads?.length ?? 0) === 0 ? (
                    <div>No uploads yet.</div>
                ) : (
                    [...uploads].reverse().map((upload, idx) => {
                        const isNewest = idx === 0;
                        return (
                            <div key={idx} style={{ marginBottom: 16, padding: 8, border: `1px solid #eee`, borderRadius: 4 }}>
                                <div style={{ marginBottom: 4 }}>
                                    <strong style={{ color: isNewest ? undefined : '#cf740d' }}>
                                        {isNewest ? 'Uploaded' : 'Upload of Older Version'}
                                    </strong>
                                </div>
                                <div>
                                    <strong>Collection Name: </strong>{upload.collectionName}
                                </div>
                                <div>
                                    <strong>Collection URL: </strong>{upload.uri}
                                </div>
                                <div>
                                    <strong>Date Uploaded: </strong>{upload.date}
                                </div>
                                <div>
                                    <strong>File: </strong>{upload.file}
                                </div>
                            </div>
                        );
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
