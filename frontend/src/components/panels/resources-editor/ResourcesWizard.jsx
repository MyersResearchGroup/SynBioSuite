import { Container, Stepper, Group, Button, Space, ScrollArea } from "@mantine/core"
import { MultiDropzone } from '../../Dropzone'
import { ObjectTypes } from '../../../objectTypes'
import { useContext } from 'react'
import { usePanelProperty } from "../../../redux/hooks/panelsHooks"
import { PanelContext } from './ResourcesPanel'
import PanelSaver from '../PanelSaver'
import { showErrorNotification } from "../../../modules/util"
import { useUnifiedModal } from '../../../redux/hooks/useUnifiedModal'
import { MODAL_TYPES } from '../../../modules/unified_modal'
import { showNotification } from '@mantine/notifications'


export default function ResourcesWizard() {
    const panelId = useContext(PanelContext)
    PanelSaver(panelId)

    const { workflows } = useUnifiedModal()

    const [files, setFiles] = usePanelProperty(panelId, 'files', false, []) || []
    const handleFilesChange = name => {
        setFiles([...files, name])
    }

    const [selectedRow, setSelectedRow] = usePanelProperty(panelId, 'collection', false, {})
    const [uploads, setUploads] = usePanelProperty(panelId, 'uploads', false, [])

    const handleRemoveFiles = id => {
        const newFiles = files.filter(item => item !== id)
        setFiles( newFiles)
    }
    
    const handleValidateAndUpload = async () => {
        workflows.browseCollections((result) => {
            if (result?.completed && result?.collections && result.collections.length > 0) {
                const collection = result.collections[0]
                setUploads([
                    ...uploads,
                    {
                        collectionName: collection.name || collection.displayId,
                        uri: collection.uri,
                        files: [...files],
                        date: new Date().toLocaleString(undefined, { timeZoneName: 'short' })
                    }
                ])
                
                showNotification({
                    title: 'Upload Recorded',
                    message: `Collection "${collection.name || collection.displayId}" selected for upload.`,
                    color: 'green'
                })
            }
        }, { multiSelect: false })
    }

    return (
        <Container style={stepperContainerStyle}>
            <Button onClick={handleValidateAndUpload}>Validate and Upload to SynBioHub</Button>
            <Space h="md" />
            <ScrollArea h={600} type="always">
                {(uploads?.length ?? 0) === 0 ? (
                    <div>No uploads yet.</div>
                ) : (
                    uploads.map((upload, idx) => (
                        <div key={idx} style={{ marginBottom: 16, padding: 8, border: '1px solid #eee', borderRadius: 4 }}>
                            <div>
                                <strong>Collection Name:</strong> {upload.collectionName}
                            </div>
                            <div>
                                <strong>Collection URL:</strong> {upload.uri}
                            </div>
                            <div>
                                <strong>Date Uploaded:</strong> {upload.date}
                            </div>
                            <div>
                                <strong>Files:</strong>
                                <ul>
                                    {(upload.files || []).map((file, fidx) => (
                                        <li key={fidx}>{file}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))
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
