import { Button, Container, Group, Loader, Space, Stack } from '@mantine/core'
import { useContext, useState, useEffect } from 'react'
import { usePanelProperty, useOpenPanel } from '../../../redux/hooks/panelsHooks'
import { useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { useLocalStorage } from '@mantine/hooks'
import { PanelContext } from './CollectionPanel'
import { ObjectTypes } from '../../../objectTypes'
import { uploadExperiment, CheckLogin } from '../../../API'
import { showErrorNotification } from '../../../modules/util'
import Dropzone from '../../Dropzone'
import { readStudy } from "../../../modules/util";
import { useSelector } from "react-redux";
import useUnifiedModal from '../../../redux/hooks/useUnifiedModal';

export default function CollectionWizard() {
    const panelId = useContext(PanelContext)
    const openPanel = useOpenPanel()
    const [dataSBH] = useLocalStorage({ key: 'SynbioHub', defaultValue: [] })
    const { open, MODAL_TYPES } = useUnifiedModal()

    const [metadataID, setMetadataID] = usePanelProperty(panelId, 'metadata', false)
    const metadataFile = useFile(metadataID)

    const [resultsID, setResultsID] = usePanelProperty(panelId, 'results', false)
    const resultsFile = useFile(resultsID)

    const [plateOutputID, setPlateOutputID] = usePanelProperty(panelId, 'plateOutput', false)
    const plateOutputFile = useFile(plateOutputID)

    const [collection] = usePanelProperty(panelId, 'collection', false, {})
    const [uploads, setUploads] = usePanelProperty(panelId, 'uploads', false, [])

    const [isSubmitting, setIsSubmitting] = useState(false)

    const dirName = useSelector(
      state => state.workingDirectory.directoryHandle
    );

    const [study, setStudy] = useState(null);

    useEffect(() => {
      async function loadStudy() {
        if (!dirName) return;

        try {
          const study = await readStudy(dirName);
          setStudy(study);
        } catch (e) {
          console.error("Failed to read study.json", e);
        }
      }
      loadStudy();
    }, [dirName]);

    const collectionUrl = study?.collectionUri ?? "";
    const selectedRepo = study?.registryURL ?? "";
    const registryAPI = study?.registryAPI ?? "";
    const authToken = collection?.authToken || collection?.modalResult?.authToken || dataSBH.find((repo) => repo.registryURL === selectedRepo)?.authtoken || ''

    const getStoredToken = () => {
        try {
            const stored = localStorage.getItem('SynbioHub');
            if (!stored) return null;
            const repos = JSON.parse(stored);
            return repos.find((repo) => repo.registryURL === selectedRepo)?.authtoken || null;
        } catch {
            return null;
        }
    };

    const openLoginWorkflow = () => new Promise((resolve) => {
        open(MODAL_TYPES.SBH_LOGIN, {
            allowedModals: [MODAL_TYPES.SBH_LOGIN, MODAL_TYPES.ADD_SBH_REPO],
            props: { selectedRepo },
            onComplete: (result) => resolve(result || null),
        });
    });

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

        let currentToken = collection?.authToken || collection?.modalResult?.authToken || dataSBH.find((repo) => repo.registryURL === selectedRepo)?.authtoken || ''

        if (!currentToken) {
            const loginResult = await openLoginWorkflow();
            if (!loginResult?.completed) {
                showErrorNotification('Login cancelled', 'Please log in to your SynBioHub repository before updating this Assay.')
                return
            }
            currentToken = getStoredToken() || '';
        }

        if (!currentToken) {
            showErrorNotification('Not logged in', 'Please log in to your SynBioHub repository before updating this Assay.')
            return
        }

        try {
            const loginResult = await CheckLogin(selectedRepo, currentToken);
            if (!loginResult?.valid) {
                const loginResult = await openLoginWorkflow();
                if (!loginResult?.completed) {
                    showErrorNotification('Login cancelled', 'Please log in to your SynBioHub repository before updating this Assay.')
                    return
                }
                currentToken = getStoredToken() || '';
                if (!currentToken) {
                    showErrorNotification('Not logged in', 'Please log in to your SynBioHub repository before updating this Assay.')
                    return
                }
            }
        } catch {
            const loginResult = await openLoginWorkflow();
            if (!loginResult?.completed) {
                showErrorNotification('Login cancelled', 'Please log in to your SynBioHub repository before updating this Assay.')
                return
            }
            currentToken = getStoredToken() || '';
            if (!currentToken) {
                showErrorNotification('Not logged in', 'Please log in to your SynBioHub repository before updating this Assay.')
                return
            }
        }

        setIsSubmitting(true)
        try {
            const response = await uploadExperiment(
                metadataFile,
                registryAPI,
                currentToken,
                collectionUrl,
                null,
                3,
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
