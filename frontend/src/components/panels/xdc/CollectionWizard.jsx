import { Button, Container, Group, Loader, Space, Stack } from '@mantine/core'
import { useContext, useState, useEffect, useRef } from 'react'
import { usePanelProperty, useOpenPanel } from '../../../redux/hooks/panelsHooks'
import { useFile, useFiles } from '../../../redux/hooks/workingDirectoryHooks'
import { useLocalStorage } from '@mantine/hooks'
import { PanelContext } from './CollectionPanel'
import { ObjectTypes } from '../../../objectTypes'
import { uploadExperiment, CheckLogin, CheckFJLogin, CheckBOBLogin, checkBOBUpload } from '../../../API'
import { showNotification } from '@mantine/notifications'
import { showErrorNotification } from '../../../modules/util'
import Dropzone, { MultiDropzone } from '../../Dropzone'
import { readStudy } from "../../../modules/util";
import { useSelector } from "react-redux";
import useUnifiedModal from '../../../redux/hooks/useUnifiedModal';
import BOBCheckModal from './BOBCheckModal';

export default function CollectionWizard() {
    const panelId = useContext(PanelContext)
    const openPanel = useOpenPanel()
    const [dataSBH] = useLocalStorage({ key: 'SynbioHub', defaultValue: [] })     
    const [dataFJ] = useLocalStorage({ key: 'Flapjack', defaultValue: [] })
    const { open, MODAL_TYPES } = useUnifiedModal()

    const metadataID = usePanelProperty(panelId, 'metadata')
    const [resultsIDsRaw, setResultsIDsRaw] = usePanelProperty(panelId, 'results', false, [])
    const [plateOutputID, setPlateOutputID] = usePanelProperty(panelId, 'plateOutput', false)
    const files = useFiles()

    const resolveStoredFileId = (value) => {
        if (!value) return null
        const directMatch = files.find(f => f.id === value)
        if (directMatch) return directMatch.id
        const normalized = String(value).split('/').pop()
        const filenameMatch = files.find(f => f.name === normalized || f.id === normalized)
        return filenameMatch?.id ?? value
    }

    const resultsIDs = Array.isArray(resultsIDsRaw) ? resultsIDsRaw : (resultsIDsRaw ? [resultsIDsRaw] : [])
    const resolvedResultsIDs = resultsIDs.map(resolveStoredFileId)
    const resultsFiles = (resolvedResultsIDs || []).map(id => files.find(f => f.id === id)).filter(Boolean)

    const resolvedMetadataID = resolveStoredFileId(metadataID)
    const metadataFile = useFile(resolvedMetadataID)
    const resolvedPlateOutputID = resolveStoredFileId(plateOutputID)
    const plateOutputFile = useFile(resolvedPlateOutputID)

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
          console.error("Failed to read study file", e);
        }
      }
      loadStudy();
    }, [dirName]);

    const collectionUrl = study?.collectionUri ?? "";
    const selectedRepo = study?.registryURL ?? "";
    const registryAPI = study?.registryAPI ?? "";
    const registryPrefix = study?.registryPrefix ?? "";
    let studyFJid = study?.FJid ?? "";
    const selectedFJRepo = study?.registryURLFJ ?? "";
    let registryAPIFJ = study?.registryAPIFJ ?? "";
    const studyBOBid = study?.BOBid ?? "";
    const selectedBOBRepo = study?.registryURLBOB ?? "";
    const registryAPIBOB = study?.registryAPIBOB || selectedBOBRepo;

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

    const getStoredFJToken = () => {
        try {
            const stored = localStorage.getItem('Flapjack');
            if (!stored) return null;
            const repos = JSON.parse(stored);
            return repos.find((repo) => repo.registryURL === selectedFJRepo)?.authtoken || null;
        } catch {
            return null;
        }
    };

    const getStoredFJRefreshToken = () => {
        try {
            const stored = localStorage.getItem('Flapjack');
            if (!stored) return null;
            const repos = JSON.parse(stored);
            return repos.find((repo) => repo.registryURL === selectedFJRepo)?.refresh || null;
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

    const openFJLoginWorkflow = () => new Promise((resolve) => {
        open(MODAL_TYPES.FJ_LOGIN, {
            allowedModals: [MODAL_TYPES.FJ_LOGIN, MODAL_TYPES.ADD_FJ_REPO],
            props: { selectedRepo: selectedFJRepo, selectedFJRepo },
            onComplete: (result) => resolve(result || null),
        });
    });

    const getStoredBOBToken = () => {
        try {
            const repos = JSON.parse(localStorage.getItem('BOB') || '[]');
            return repos.find((repo) => repo.registryURL === selectedBOBRepo)?.authtoken || null;
        } catch {
            return null;
        }
    };

    const openBOBLoginWorkflow = () => new Promise((resolve) => {
        open(MODAL_TYPES.BOB_LOGIN, {
            allowedModals: [MODAL_TYPES.BOB_LOGIN, MODAL_TYPES.ADD_BOB_REPO],
            props: { selectedRepo: selectedBOBRepo, selectedBOBRepo },
            onComplete: (result) => resolve(result || null),
        });
    });

    // BOB is asked what it would do before anything is written; the user confirms, or picks the assay, in a modal.
    const [bobReview, setBobReview] = useState(null)
    const bobReviewFlow = useRef(null)

    const finishBOBReview = (result) => {
        bobReviewFlow.current?.resolve(result)
        bobReviewFlow.current = null
        setBobReview(null)
    }

    const checkWithBOB = async (pairing) => {
        const flow = bobReviewFlow.current
        if (!flow) return
        setBobReview((current) => ({ ...(current || {}), pairing, busy: true }))
        try {
            const { args } = flow
            const plateAssays = Object.keys(pairing).length ? pairing : null
            const found = await checkBOBUpload(args.metadataFile, args.sbhPrefix, args.sbhToken, [args.plate], { ...args.bob, plateAssays })
            const suggested = Object.fromEntries(found.pairing.filter((x) => x.source === 'file name' && x.assay_id).map((x) => [x.plate, x.assay_id]))
            if (!plateAssays && Object.keys(suggested).length === found.pairing.length) {
                flow.suggested = suggested
                return checkWithBOB(suggested)
            }
            setBobReview({ found, pairing, suggested: flow.suggested || {}, busy: false })
        } catch (error) {
            showErrorNotification('BOB check failed', error.message)
            finishBOBReview(null)
        }
    }

    const reviewBOBUpload = (args) => new Promise((resolve) => {
        bobReviewFlow.current = { resolve, args }
        setBobReview({ found: null, pairing: {}, busy: true })
        checkWithBOB({})
    })

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

        const repoInfo = dataSBH.find(repo => repo.registryURL === selectedRepo);

        let currentToken = repoInfo?.authtoken ?? "";

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
            const loginResult = await CheckLogin(registryAPI || selectedRepo, currentToken);
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

        const repoInfoFJ = dataFJ.find(repo => repo.registryURL === selectedFJRepo);

        let currentFJToken = repoInfoFJ?.authtoken ?? "";
        let currentFJRefreshToken = repoInfoFJ?.refresh ?? "";

        if (plateOutputFile && selectedFJRepo) {
            if (!currentFJToken) {
                const loginResult = await openFJLoginWorkflow();
                if (!loginResult?.completed) {
                    showErrorNotification('Login cancelled', 'Please log in to your Flapjack repository before updating this Assay.')
                    return
                }
            }
            currentFJToken = getStoredFJToken() || '';
            currentFJRefreshToken = getStoredFJRefreshToken() || '';

            if (!currentFJToken) {
                showErrorNotification('Not logged in', 'Please log in to your Flapjack repository before updating this Assay.')
                return
             }

            try {
                const loginResult = await CheckFJLogin(registryAPIFJ || selectedFJRepo, currentFJToken);
                if (!loginResult?.valid) {
                    const loginResult = await openFJLoginWorkflow();
                    if (!loginResult?.completed) {
                        showErrorNotification('Login cancelled', 'Please log in to your Flapjack repository before updating this Assay.')
                        return
                    }
                    currentFJToken = getStoredFJToken() || '';
                    if (!currentFJToken) {
                        showErrorNotification('Not logged in', 'Please log in to your Flapjack repository before updating this Assay.')
                        return
                    }
                }
            } catch {
                const loginResult = await openFJLoginWorkflow();
                if (!loginResult?.completed) {
                    showErrorNotification('Login cancelled', 'Please log in to your Flapjack repository before updating this Assay.')
                    return
                }
                currentFJToken = getStoredFJToken() || '';
                if (!currentFJToken) {
                    showErrorNotification('Not logged in', 'Please log in to your Flapjack repository before updating this Assay.')
                    return
                }
            }

        } else {
            registryAPIFJ = null;
            studyFJid = null;
        }

        let currentBOBToken = '';
        if (plateOutputFile && selectedBOBRepo && studyBOBid) {
            currentBOBToken = getStoredBOBToken() || '';
            let valid = false;
            try {
                valid = (await CheckBOBLogin(registryAPIBOB, currentBOBToken)).valid;
            } catch {
                valid = false;
            }
            if (!valid) {
                const loginResult = await openBOBLoginWorkflow();
                currentBOBToken = loginResult?.completed ? (getStoredBOBToken() || '') : '';
            }
            if (!currentBOBToken) {
                showErrorNotification('Not logged in', 'Please log in to your BOB server before updating this Assay.')
                return
            }
        }

        let bobPlateAssays = null
        if (currentBOBToken) {
            const reviewed = await reviewBOBUpload({
                metadataFile,
                plate: plateOutputFile,
                sbhPrefix: registryPrefix || selectedRepo,
                sbhToken: currentToken,
                bob: { url: registryAPIBOB, token: currentBOBToken, studyId: studyBOBid },
            })
            if (!reviewed) return
            bobPlateAssays = reviewed.plateAssays
        }

        setIsSubmitting(true)
        try {
            const response = await uploadExperiment(
                metadataFile,
                registryAPI,
                registryPrefix,
                currentToken,
                collectionUrl,
                registryAPIFJ,
                currentFJToken,
                currentFJRefreshToken,
                studyFJid || null,
                null,
                true,
                //uploadCount > 0 ? 3 : (collection?.sbh_overwrite ?? 0),
                {
                    attachments: (resultsFiles && resultsFiles.length) ? resultsFiles : [],
                    plateReaderOutputs: plateOutputFile ? [plateOutputFile] : [],
                },
                currentBOBToken ? { url: registryAPIBOB, token: currentBOBToken, studyId: studyBOBid, plateAssays: bobPlateAssays } : null
            )
            if (response?.bob) {
                const warnings = response.bob.warnings || []
                const saved = response.bob.assays.filter((a) => a.action !== 'unchanged').length
                showNotification({
                    title: 'Sent to BOB',
                    message: (response.bob.changed === false ? 'BOB already had this upload; nothing changed.' : `${saved} assay(s) saved in the BOB study.`)
                        + (warnings.length ? ' ' + warnings.join(' ') : ''),
                    color: warnings.length ? 'yellow' : 'green',
                })
            }
            const uploadEntry = {
                collectionName: collection?.name || collection?.displayId || collectionUrl,
                uri: response.subCollectionUrl || collectionUrl,
                date: new Date().toLocaleString(undefined, { timeZoneName: 'short' }),
                file: metadataFile.name,
                results: resolvedResultsIDs,
                plateOutput: resolvedPlateOutputID,
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
            <BOBCheckModal
                review={bobReview}
                onPair={(pairing) => checkWithBOB(pairing)}
                onConfirm={() => finishBOBReview({ plateAssays: Object.keys(bobReview.pairing).length ? bobReview.pairing : null })}
                onCancel={() => finishBOBReview(null)}
            />
            <Stack gap="xl">
                <div>
                    <Dropzone
                        allowedTypes={[ObjectTypes.PlateReader.id]}
                        item={plateOutputFile?.name}
                        onItemChange={setPlateOutputID}
                    >
                        Drag & drop plate reader output from the explorer
                    </Dropzone>
                    <MultiDropzone
                        allowedTypes={[ObjectTypes.Results.id]}
                        items={resultsIDs}
                        onItemsChange={setResultsIDsRaw}
                        onRemoveItem={item => setResultsIDsRaw((current) => (Array.isArray(current) ? current : (current ? [current] : [])).filter(x => x !== item))}
                        labelForItem={id => (files.find(f => f.id === id)?.name) || id}
                    >
                        Drag & drop other experimental results from the explorer
                    </MultiDropzone>
                </div>
            </Stack>
            <Group position="center" style={{ width: '100%', marginTop: 20 }}>
                <Button
                    variant='default'
                    onClick={handleSubmit}
                    disabled={isSubmitting}
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
