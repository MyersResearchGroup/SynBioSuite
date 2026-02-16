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
    
    const handleValidateAndUpload = async () => {
        workflows.browseCollections((result) => {
            if (result?.completed && result?.collections && result.collections.length > 0) {
                const collection = result.collections[0]
                setUploads([
                    ...uploads,
                    {
                        collectionName: collection.name || collection.displayId,
                        uri: collection.uri,
                        file: file,
                        date: new Date().toLocaleString(undefined, { timeZoneName: 'short' })
                    }
                ])

                upload_resource(file, result.sbh_credential_check.selectedRepo, result.authToken, collection.displayId, collection.description, workingDirectory, result.sbh_overwrite)
                
                showErrorNotification("Not Implemented", "File validation and upload are currently not implemented");
            }
        }, { multiSelect: false, rootOnly: true })
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
                                <strong>Collection Name:</strong>{upload.collectionName}
                            </div>
                            <div>
                                <strong>Collection URL:</strong>{upload.uri}
                            </div>
                            <div>
                                <strong>Date Uploaded:</strong>{upload.date}
                            </div>
                            <div>
                                <strong>File:</strong>{upload.file}
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
