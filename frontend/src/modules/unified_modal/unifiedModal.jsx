import { Modal, Button, Stack, Group } from '@mantine/core';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { closeUnifiedModal } from '../../redux/slices/modalSlice';
import { setSBHPrimary } from '../../redux/slices/primaryRepositorySlice';

// Todo: Modernize the following legacy modals
import SBHLogin from '../modular_login/SBHOnly';
import FJLogin from '../modular_login/FJLogin';
import CreateCollectionModal from '../CreateCollectionModal';
import SBHInstanceSelector from '../modular_login/SBHInstanceSelector';
import FJInstanceSelector from '../modular_login/FJInstanceSelector';
import RepositorySelectorModal from './RepositorySelectorModal';
import FlapjackOptionsModal from './FlapjackOptionsModal';
import CollectionBrowserModal from './CollectionBrowserModal';
import AddRegistryModal from './AddRegistryModal';
import WellLocationsConfigModal from './WellLocationsConfigModal';

export const MODAL_TYPES = {
    SBH_LOGIN: 'sbh_login',
    FJ_LOGIN: 'fj_login',
    ADD_SBH_REPO: 'add_sbh_repo',
    ADD_FJ_REPO: 'add_fj_repo',
    CREATE_COLLECTION: 'create_collection',
    SBH_INSTANCE_SELECTOR: 'sbh_instance_selector',
    FJ_INSTANCE_SELECTOR: 'fj_instance_selector',
    DIRECTORY_SELECT: 'directory_select',
    REPOSITORY_SELECTOR: 'repository_selector',
    SBH_CREDENTIAL_CHECK: 'sbh_credential_check',
    COLLECTION_BROWSER: 'collection_browser',
    WELL_LOCATIONS_CONFIG: 'well_locations_config',
    FLAPJACK_OPTIONS: 'flapjack_options',
};

const MODAL_FLOWS = {
    [MODAL_TYPES.SBH_LOGIN]: [MODAL_TYPES.ADD_SBH_REPO, MODAL_TYPES.FLAPJACK_OPTIONS],
    [MODAL_TYPES.FJ_LOGIN]: [MODAL_TYPES.ADD_FJ_REPO, MODAL_TYPES.FLAPJACK_OPTIONS],
    [MODAL_TYPES.ADD_SBH_REPO]: [MODAL_TYPES.SBH_LOGIN],
    [MODAL_TYPES.ADD_FJ_REPO]: [MODAL_TYPES.FJ_LOGIN],
    [MODAL_TYPES.CREATE_COLLECTION]: [MODAL_TYPES.SBH_LOGIN],
    [MODAL_TYPES.SBH_INSTANCE_SELECTOR]: [MODAL_TYPES.SBH_LOGIN, MODAL_TYPES.ADD_SBH_REPO],
    [MODAL_TYPES.FJ_INSTANCE_SELECTOR]: [MODAL_TYPES.FJ_LOGIN, MODAL_TYPES.ADD_FJ_REPO, MODAL_TYPES.CREATE_COLLECTION],
    [MODAL_TYPES.DIRECTORY_SELECT]: [],
    [MODAL_TYPES.REPOSITORY_SELECTOR]: [MODAL_TYPES.ADD_SBH_REPO, MODAL_TYPES.FLAPJACK_OPTIONS, MODAL_TYPES.SBH_LOGIN],
    [MODAL_TYPES.WELL_LOCATIONS_CONFIG]: [],
    [MODAL_TYPES.COLLECTION_BROWSER]: [MODAL_TYPES.FLAPJACK_OPTIONS, MODAL_TYPES.CREATE_COLLECTION],
    [MODAL_TYPES.FLAPJACK_OPTIONS]: [MODAL_TYPES.FJ_INSTANCE_SELECTOR,MODAL_TYPES.CREATE_COLLECTION],
};

const titles = {
    [MODAL_TYPES.SBH_LOGIN]: 'Login to SynBioHub',
    [MODAL_TYPES.FJ_LOGIN]: 'Login to Flapjack',
    [MODAL_TYPES.ADD_SBH_REPO]: 'Add SynBioHub Repository',
    [MODAL_TYPES.ADD_FJ_REPO]: 'Add Flapjack Repository',
    [MODAL_TYPES.CREATE_COLLECTION]: 'Create Collection',
    [MODAL_TYPES.SBH_INSTANCE_SELECTOR]: 'Select SynBioHub Instance',
    [MODAL_TYPES.FJ_INSTANCE_SELECTOR]: 'Select Flapjack Instance',
    [MODAL_TYPES.DIRECTORY_SELECT]: 'Select Directory',
    [MODAL_TYPES.REPOSITORY_SELECTOR]: 'Select Repository',
    [MODAL_TYPES.SBH_CREDENTIAL_CHECK]: 'Verify Credentials',
    [MODAL_TYPES.COLLECTION_BROWSER]: 'Browse Collections',
    [MODAL_TYPES.WELL_LOCATIONS_CONFIG]: 'Well Locations & Advanced Configurations',
    [MODAL_TYPES.FLAPJACK_OPTIONS]: "Flapjack Options",
};

const sizes = {
            [MODAL_TYPES.CREATE_COLLECTION]: 'xl',
            [MODAL_TYPES.ADD_SBH_REPO]: 'xl',
            [MODAL_TYPES.ADD_FJ_REPO]: 'xl',
            [MODAL_TYPES.SBH_INSTANCE_SELECTOR]: 'xl',
            [MODAL_TYPES.FJ_INSTANCE_SELECTOR]: 'xl',
            [MODAL_TYPES.COLLECTION_BROWSER]: 1200,
            [MODAL_TYPES.REPOSITORY_SELECTOR]: 'lg',
            [MODAL_TYPES.SBH_CREDENTIAL_CHECK]: 'lg',
            [MODAL_TYPES.WELL_LOCATIONS_CONFIG]: 'lg',
        };

/**
 * Unified Modal Component
 * 
 * @param {boolean} opened - Whether the modal is open
 * @param {function} onClose - Callback when modal closes
 * @param {string} initialModal - Initial modal type to display
 * @param {Array<string>} allowedModals - Array of allowed modal types (limits navigation)
 * @param {function} onComplete - Callback when workflow completes successfully
 * @param {object} modalProps - Additional props to pass to the current modal
 */
function UnifiedModal({ 
    opened, 
    onClose, 
    initialModal = null,
    allowedModals = Object.values(MODAL_TYPES),
    onComplete = null,
    modalProps = {}
}) {

    const [currentModal, setCurrentModal] = useState(initialModal);
    const currentModalRef = useRef(currentModal);
    const [modalHistory, setModalHistory] = useState([]);
    const suppressAutoRef = useRef({});
    const [modalData, setModalData] = useState({});
    const completedRef = useRef(false);
    const dispatch = useDispatch();

    useEffect(() => {
        if (opened) {
            setModalHistory([]);

            // Ensure current modal updates when the modal is opened with a new initialModal
            setCurrentModal(initialModal);

            setModalData({
                [initialModal]: modalProps,
            });

            completedRef.current = false;
        }
    }, [opened, initialModal, modalProps]);

    // keep a ref in sync to avoid stale closures when child components call navigateTo
    useEffect(() => {
        currentModalRef.current = currentModal;
    }, [currentModal]);
    
    useEffect(() => {
        if (currentModal !== MODAL_TYPES.SBH_LOGIN) {
            return;
        }

        const selectedRepo =
            modalData[MODAL_TYPES.SBH_LOGIN]?.selectedRepo
            || modalData.selectedRepo
            || modalProps.selectedRepo;

        if (selectedRepo) {
            dispatch(setSBHPrimary(selectedRepo));
        }
    }, [currentModal, modalData, modalProps.selectedRepo, dispatch]);

        const navigateTo = useCallback((modalType, data = {}) => {
                const sourceModal = currentModalRef.current || initialModal;
                const allowedFlow = MODAL_FLOWS[sourceModal] || [];
                const bypassAllowedModalsFor = [MODAL_TYPES.SBH_LOGIN];
                const skipAllowedModalsCheck = bypassAllowedModalsFor.includes(modalType);
                if (!allowedFlow.includes(modalType) || (!skipAllowedModalsCheck && !allowedModals.includes(modalType))) return false;

            setModalHistory(prev => [...prev, sourceModal]);
            setCurrentModal(modalType);
            setModalData(prev => ({ ...prev, [modalType]: { ...(prev[sourceModal] || modalProps), ...data } }));
            return true;
        }, [allowedModals, modalProps]);
  
    const handleClose = useCallback(() => {
        dispatch(closeUnifiedModal());
        setCurrentModal(initialModal);
        setModalHistory([]);
        setModalData({});

        if (onClose && typeof onClose === 'function') {
            try { 
                onClose(); 
            } catch (e) { 
                console.error('onClose callback error:', e); 
            }
        }
    }, [dispatch, modalData, initialModal, onClose]);

    const goBack = useCallback(() => {
        setModalHistory(prev => {
            if (!prev || prev.length === 0) { handleClose(); return []; }
            const previousModal = prev[prev.length - 1];
            suppressAutoRef.current = { ...(suppressAutoRef.current || {}), [previousModal]: true };
            setCurrentModal(previousModal);
            return prev.slice(0, -1);
        });
    }, [handleClose]);

    const completeWorkflow = useCallback((data = {}) => {
        const merged = { ...modalData, ...data, completed: true };
        setModalData(merged);
        completedRef.current = true;
        
        dispatch(closeUnifiedModal({ modalData: merged }));
        setCurrentModal(initialModal);
        setModalHistory([]);
        setModalData({});
    }, [dispatch, modalData, initialModal]);

    const getModalTitle = () => {
        return titles[currentModal] || 'Modal';
    };

    const getModalSize = () => {
        return sizes[currentModal] || 'md';
    };

    const getModalStyles = () => {
        if (currentModal === MODAL_TYPES.COLLECTION_BROWSER) {
            return {
                modal: {
                    maxWidth: 'calc(100vw - 64px)',
                    width: 'calc(100vw - 64px)',
                    padding: '16px 32px',
                    maxHeight: '92vh',
                    margin: 0,
                },
                body: { padding: 0 }
            };
        }
        return undefined;
    };

    const renderModalContent = () => {
        const commonProps = {
            navigateTo,
            goBack,
            completeWorkflow,
            shouldSuppressAutoNavigation: (modal) => {
                const key = modal || currentModalRef.current;
                const val = !!(suppressAutoRef.current && suppressAutoRef.current[key]);
                if (val) {
                    // clear after reading
                    suppressAutoRef.current = { ...(suppressAutoRef.current || {}), [key]: false };
                }
                return val;
            },
            modalData: modalData[currentModal] || {},
            ...modalProps,
        };

        const getStoredRegistries = (key) => {
            const rawStored = localStorage.getItem(key);
            if (!rawStored) {
                return [];
            }
            try {
                const parsed = JSON.parse(rawStored);
                return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                return [];
            }
        };
        const addRegistryToStorage = (key, data) => {
            const stored = getStoredRegistries(key);
            if (stored.some(item => item.registryURL === data.registryURL)) {
                return;
            }

            const base = {
                authtoken: '',
                email: '',
                registryURL: data.registryURL,
                registryAPI: data.registryAPI,
                registryPrefix: data.registryPrefix,
                username: '',
            };

            const instance = key === 'SynbioHub'
                ? { ...base, name: '', affiliation: '' }
                : { ...base, refresh: '' };

            localStorage.setItem(key, JSON.stringify([...stored, instance]));
        };

        switch (currentModal) {
            case MODAL_TYPES.SBH_LOGIN:
                const shouldReturnToCredentialCheck = modalHistory.includes(MODAL_TYPES.FLAPJACK_OPTIONS);
                const loginModalData = modalData[MODAL_TYPES.SBH_LOGIN] || {};
                const shouldNavigateToValidator =
                    loginModalData.returnTo === MODAL_TYPES.FLAPJACK_OPTIONS
                    && allowedModals.includes(MODAL_TYPES.FLAPJACK_OPTIONS);

                return (
                    <SBHLogin
                        opened={true}
                        onClose={() => {
                            if (shouldNavigateToValidator) {
                                const nextSelectedRepo = loginModalData.selectedRepo || modalData.selectedRepo;
                                if (nextSelectedRepo) {
                                    dispatch(setSBHPrimary(nextSelectedRepo));
                                }
                                setModalData(prev => ({
                                    ...prev,
                                    selectedRepo: nextSelectedRepo,
                                }));

                                navigateTo(MODAL_TYPES.FLAPJACK_OPTIONS, {
                                    selectedRepo: nextSelectedRepo,
                                    expectedEmail: modalData.expectedEmail,
                                    skipRepositorySelection: modalData.skipRepositorySelection,
                                });
                                return;
                            }

                            shouldReturnToCredentialCheck ? goBack() : completeWorkflow();
                        }}
                        {...commonProps}
                    />
                );

            case MODAL_TYPES.FJ_LOGIN:
                return (
                    <FJLogin
                        opened={true}
                        onClose={() => {
                            completeWorkflow();
                        }}
                        onLoginSuccess={completeWorkflow}
                        {...commonProps}
                    />
                );

            case MODAL_TYPES.ADD_SBH_REPO:
                const hasCredentialCheckInHistory = modalHistory.includes(MODAL_TYPES.FLAPJACK_OPTIONS);
                const hasRepoSelectorInHistory = modalHistory.includes(MODAL_TYPES.REPOSITORY_SELECTOR);
                const shouldReturnToValidator = hasCredentialCheckInHistory || hasRepoSelectorInHistory;
                return (
                    <AddRegistryModal
                        opened={true}
                        onClose={handleClose}
                        closeOnSubmit={false}
                        onAdd={(data) => {
                            addRegistryToStorage('SynbioHub', data);
                            dispatch(setSBHPrimary(data.registryURL));
                            setModalData(prev => ({ ...prev, selectedRepo: data.registryURL }));

                            if (shouldReturnToValidator) {
                                navigateTo(MODAL_TYPES.SBH_LOGIN, {
                                    selectedRepo: data.registryURL,
                                    returnTo: MODAL_TYPES.FLAPJACK_OPTIONS,
                                });
                                return;
                            }

                            completeWorkflow({ selectedRepo: data.registryURL });
                        }}
                        title="SynBioHub Repository"
                        existingRegistries={getStoredRegistries('SynbioHub').map(item => item.registryURL)}
                    />
                );

            case MODAL_TYPES.ADD_FJ_REPO:
                return (
                    <AddRegistryModal
                        opened={true}
                        onClose={handleClose}
                        closeOnSubmit={false}
                        onAdd={(data) => {
                            addRegistryToStorage('Flapjack', data);
                            setModalData(prev => ({ ...prev, selectedRepo: data.registryURL }));
                            completeWorkflow({ selectedRepo: data.registryURL });
                        }}
                        title="Flapjack Repository"
                        existingRegistries={getStoredRegistries('Flapjack').map(item => item.registryURL)}
                    />
                );

            case MODAL_TYPES.CREATE_COLLECTION:
                return (
                    <CreateCollectionModal
                        opened={true}
                        onClose={completeWorkflow}
                        studyName={modalProps.studyName}
                        studyDescription={modalProps.studyDescription}
                        {...commonProps}
                    />
                );

            case MODAL_TYPES.SBH_INSTANCE_SELECTOR:
                return (
                    <SBHInstanceSelector
                        onClose={completeWorkflow}
                        setRepoSelection={(selection) => setModalData(prev => ({ ...prev, selectedRepo: selection }))}
                        {...commonProps}
                    />
                );

            case MODAL_TYPES.FJ_INSTANCE_SELECTOR:
                return (
                    <FJInstanceSelector
                        onClose={() => {navigateTo(MODAL_TYPES.CREATE_COLLECTION);}}
                        setRepoSelection={(selection) =>
                            setModalData(prev => ({...prev,selectedFJRepo: selection}))
                        }
                    />
                );

            case MODAL_TYPES.DIRECTORY_SELECT:
                return (
                    <Stack spacing="md">
                        <Button onClick={completeWorkflow}>Select Directory</Button>
                    </Stack>
                );

            case MODAL_TYPES.REPOSITORY_SELECTOR:
                return (
                    <RepositorySelectorModal
                        navigateTo={navigateTo}
                        goBack={goBack}
                        completeWorkflow={completeWorkflow}
                        setModalData={setModalData}
                        {...commonProps}
                    />
                );

            /* SBH_CREDENTIAL_CHECK removed: flows now go directly to FLAPJACK_OPTIONS */

            case MODAL_TYPES.COLLECTION_BROWSER:
                return (
                    <CollectionBrowserModal
                        navigateTo={navigateTo}
                        goBack={goBack}
                        completeWorkflow={completeWorkflow}
                        modalData={modalData}
                        setModalData={setModalData}
                        onCancel={handleClose}
                        {...commonProps}
                    />
                );

            case MODAL_TYPES.WELL_LOCATIONS_CONFIG:
                return (
                    <WellLocationsConfigModal
                        navigateTo={navigateTo}
                        goBack={goBack}
                        completeWorkflow={completeWorkflow}
                        modalData={modalData}
                        onCancel={handleClose}
                        {...commonProps}
                    />
                );

            case MODAL_TYPES.FLAPJACK_OPTIONS:
                return (
                    <FlapjackOptionsModal
                        {...commonProps}
                    />
                );

            default:
                return (
                    <Stack spacing="md">
                        <p>Unknown modal type: {currentModal}</p>
                        <Button onClick={handleClose}>Close</Button>
                    </Stack>
                );
        }
    };

    const selfContainedModals = [
        MODAL_TYPES.SBH_LOGIN,
        MODAL_TYPES.ADD_SBH_REPO,
        MODAL_TYPES.ADD_FJ_REPO,
        MODAL_TYPES.CREATE_COLLECTION,
    ];

    if (!opened) return null;

    if (selfContainedModals.includes(currentModal)) {
        return renderModalContent();
    }

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={getModalTitle()}
            size={getModalSize()}
            styles={getModalStyles()}
        >
            <Stack spacing="md">
                {renderModalContent()}
                
                <Group position="apart" mt="xl">
                    {modalHistory.length > 0 && (
                        <Button variant="default" onClick={goBack}>Back</Button>
                    )}
                    <Button variant="subtle" onClick={handleClose} ml="auto">Cancel</Button>
                </Group>
            </Stack>
        </Modal>
    );
}

export default UnifiedModal;
