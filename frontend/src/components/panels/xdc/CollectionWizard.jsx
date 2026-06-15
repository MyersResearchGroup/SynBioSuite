import { Button, Container, Group, Loader, Space, Stack } from '@mantine/core'
// import { Notifications } from '@mantine/notifications'
import { useContext, useState } from 'react'
import { usePanelProperty, useOpenPanel } from '../../../redux/hooks/panelsHooks'
import { useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { useLocalStorage } from '@mantine/hooks'
import { PanelContext } from './CollectionPanel'
import { ObjectTypes } from '../../../objectTypes'
import { uploadExperiment } from '../../../API'
import { showErrorNotification } from '../../../modules/util'
import Dropzone from '../../Dropzone'

export default function CollectionWizard({ onUploadSuccess }) {
    const panelId = useContext(PanelContext)
    const openPanel = useOpenPanel()
    const [dataSBH] = useLocalStorage({ key: 'SynbioHub', defaultValue: [] })

    const [metadataID, setMetadataID] = usePanelProperty(panelId, 'metadata', false)
    const metadataFile = useFile(metadataID)

    const [resultsID, setResultsID] = usePanelProperty(panelId, 'results', false)
    const resultsFile = useFile(resultsID)

    const [plateOutputID, setPlateOutputID] = usePanelProperty(panelId, 'plateOutput', false)
    const plateOutputFile = useFile(plateOutputID)

    const [collection] = usePanelProperty(panelId, 'collection', false, {})
    const [uploads, setUploads] = usePanelProperty(panelId, 'uploads', false, [])

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [uploadSuccess, setUploadSuccess] = useState(false)

    const selectedRepo = collection?.selectedRepo || collection?.modalResult?.selectedRepo || ''
    const authToken = collection?.authToken || collection?.modalResult?.authToken || dataSBH.find((repo) => repo.registryURL === selectedRepo)?.authtoken || ''
    const registryAPI = dataSBH.find((repo) => repo.registryURL === selectedRepo)?.registryAPI || selectedRepo
    const collectionUrl = collection?.uri || collection?.collectionUrl || collection?.collections?.[0]?.uri || ''
    const uploadCount = uploads?.length ?? 0
    const uploadLabel = uploadCount > 0 ? 'Update' : 'Upload'

    const handleSubmit = async () => {
        if (!metadataFile) {
            showErrorNotification('Missing file', 'Please choose a study metadata file before uploading.')
            return
        }

        if (!collectionUrl) {
            showErrorNotification('Missing collection', 'Please choose a target collection before uploading.')
            return
        }

        setIsSubmitting(true)
        try {
            const response = await uploadExperiment(
                metadataFile,
                registryAPI,
                authToken,
                collectionUrl,
                null,
                collection.sbh_overwrite,
                //uploadCount > 0 ? 3 : (collection?.sbh_overwrite ?? 0),
                {
                    attachments: resultsFile ? [resultsFile] : [],
                    plateReaderOutputs: plateOutputFile ? [plateOutputFile] : [],
                }
            )

            const uploadEntry = {
                collectionName: collection?.name || collection?.displayId || collectionUrl,
                uri: response?.sbh_url || collectionUrl,
                date: new Date().toLocaleString(undefined, { timeZoneName: 'short' }),
                file: metadataFile.name,
                selectedRepo,
                status: response?.status || 'success',
            }

            setUploads((currentUploads) => [...(currentUploads || []), uploadEntry])
            setUploadSuccess(true)

            // notifications.show({
            //     title: 'Upload successful',
            //     message: 'Your collection has been uploaded.',
            //     color: 'green',
            //     action: {
            //         label: 'See Results',
            //         onClick: onUploadSuccess
            //     }
            // })

        } catch (error) {
            showErrorNotification('Upload failed', error?.response?.data?.error || error.message || 'Unable to upload the collection metadata.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Container style={stepperContainerStyle}>
            <Stack gap="xl">
                <div>
                    <Dropzone
                        allowedTypes={[ObjectTypes.Metadata.id]}
                        item={metadataFile?.name}
                        onItemChange={setMetadataID}
                    >
                        Drag & drop Study Metadata from the explorer
                    </Dropzone>
                    <Space h="lg" />
                    <Dropzone
                        allowedTypes={[ObjectTypes.Results.id]}
                        item={resultsFile?.name}
                        onItemChange={setResultsID}
                    >
                        Drag & drop Experimental Results from the explorer
                    </Dropzone>
                    <Space h="lg" />
                    <Dropzone
                        allowedTypes={[ObjectTypes.PlateReader.id]}
                        item={plateOutputFile?.name}
                        onItemChange={setPlateOutputID}
                    >
                        Drag & drop Plate Reader Output from the explorer
                    </Dropzone>
                </div>
            </Stack>
            <Group position="center" style={{ width: '100%', marginTop: 20 }}>
                <Button
                    variant='default'
                    onClick={handleSubmit}
                    disabled={!metadataFile || isSubmitting}
                >
                    {isSubmitting ? <Loader size="xs" /> : uploadLabel}
                </Button>
            </Group>

            {uploadSuccess && (
            <Button 
                onClick={onUploadSuccess}
                color="green"
                style={{ marginTop: 20 }}
            >
                See Results
            </Button>
            )}

        </Container>
    )
}

const stepperContainerStyle = {
    marginTop: 40,
    padding: '0 40px',
    flexDirection: 'column',
    width: '100%',
    display: 'flex',
    justifyContent: 'center'
}