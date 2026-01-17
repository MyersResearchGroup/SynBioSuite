import { Modal, Button, Stack, Group } from '@mantine/core';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { closeUnifiedModal } from '../../redux/slices/modalSlice';

// Todo: Modernize the following legacy modals
import SBHLogin from '../modular_login/SBHOnly';
import AddSBHRepository from '../modular_login/addSBHRepository';
import AddFJRepository from '../modular_login/addFJRepository';
import CreateCollectionModal from '../CreateCollectionModal';
import SBHInstanceSelector from '../modular_login/SBHInstanceSelector';
import FJInstanceSelector from '../modular_login/FJInstanceSelector';
import RepositorySelectorModal from './RepositorySelectorModal';
import CredentialCheckModal from './CredentialCheckModal';
import CollectionBrowserModal from './CollectionBrowserModal';

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
};

const MODAL_FLOWS = {
    [MODAL_TYPES.SBH_LOGIN]: [MODAL_TYPES.ADD_SBH_REPO],
    [MODAL_TYPES.FJ_LOGIN]: [MODAL_TYPES.ADD_FJ_REPO],
    [MODAL_TYPES.ADD_SBH_REPO]: [],
    [MODAL_TYPES.ADD_FJ_REPO]: [],
    [MODAL_TYPES.CREATE_COLLECTION]: [MODAL_TYPES.SBH_LOGIN],
    [MODAL_TYPES.SBH_INSTANCE_SELECTOR]: [MODAL_TYPES.SBH_LOGIN, MODAL_TYPES.ADD_SBH_REPO],
    [MODAL_TYPES.FJ_INSTANCE_SELECTOR]: [MODAL_TYPES.FJ_LOGIN, MODAL_TYPES.ADD_FJ_REPO],
    [MODAL_TYPES.DIRECTORY_SELECT]: [],
    [MODAL_TYPES.REPOSITORY_SELECTOR]: [MODAL_TYPES.ADD_SBH_REPO, MODAL_TYPES.SBH_CREDENTIAL_CHECK],
    [MODAL_TYPES.SBH_CREDENTIAL_CHECK]: [MODAL_TYPES.SBH_LOGIN, MODAL_TYPES.COLLECTION_BROWSER],
    [MODAL_TYPES.COLLECTION_BROWSER]: [MODAL_TYPES.SBH_CREDENTIAL_CHECK],
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
    if (!opened) return null;

    const [currentModal, setCurrentModal] = useState(initialModal);
    const [modalHistory, setModalHistory] = useState([]);
    const [modalData, setModalData] = useState({});
    const completedRef = useRef(false);
    const dispatch = useDispatch();

    useEffect(() => {
        if (opened) {
            setCurrentModal(initialModal);
            setModalHistory([]);
            setModalData({});
            completedRef.current = false;
        }
    }, [opened, initialModal]);

    const navigateTo = useCallback((modalType, data = {}) => {
        const currentFlow = MODAL_FLOWS[currentModal] || [];
        
        if (!currentFlow.includes(modalType)) {
            console.warn(`Navigation from ${currentModal} to ${modalType} not allowed by flow`);
            return false;
        }

        if (!allowedModals.includes(modalType)) {
            console.warn(`Modal ${modalType} not allowed by workflow constraints`);
            return false;
        }

        setModalHistory(prev => [...prev, currentModal]);
        setCurrentModal(modalType);
        setModalData(prev => ({ ...prev, [modalType]: data }));
        return true;
    }, [currentModal, allowedModals]);

    const handleClose = useCallback(() => {
        dispatch(closeUnifiedModal({ modalData }));
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
        if (modalHistory.length === 0) {
            handleClose();
            return;
        }

        const previousModal = modalHistory[modalHistory.length - 1];
        setModalHistory(prev => prev.slice(0, -1));
        setCurrentModal(previousModal);
    }, [modalHistory, handleClose]);

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
            modalData: modalData[currentModal] || {},
            ...modalProps,
        };

        switch (currentModal) {
            case MODAL_TYPES.SBH_LOGIN:
                const shouldReturnToCredentialCheck = modalHistory.includes(MODAL_TYPES.SBH_CREDENTIAL_CHECK);
                return (
                    <SBHLogin
                        opened={true}
                        onClose={() => shouldReturnToCredentialCheck ? goBack() : completeWorkflow()}
                        {...commonProps}
                    />
                );

            case MODAL_TYPES.ADD_SBH_REPO:
                const hasCredentialCheckInHistory = modalHistory.includes(MODAL_TYPES.SBH_CREDENTIAL_CHECK);
                const hasRepoSelectorInHistory = modalHistory.includes(MODAL_TYPES.REPOSITORY_SELECTOR);
                return (
                    <AddSBHRepository
                        opened={true}
                        onClose={handleClose}
                        onSubmit={() => (hasCredentialCheckInHistory || hasRepoSelectorInHistory) ? goBack() : completeWorkflow()}
                        {...commonProps}
                    />
                );

            case MODAL_TYPES.ADD_FJ_REPO:
                return <AddFJRepository opened={true} onClose={completeWorkflow} {...commonProps} />;

            case MODAL_TYPES.CREATE_COLLECTION:
                return (
                    <CreateCollectionModal
                        opened={true}
                        onClose={completeWorkflow}
                        libraryName={modalProps.libraryName}
                        libraryDescription={modalProps.libraryDescription}
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
                        onClose={completeWorkflow}
                        setRepoSelection={(selection) => setModalData(prev => ({ ...prev, selectedRepo: selection }))}
                        {...commonProps}
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

            case MODAL_TYPES.SBH_CREDENTIAL_CHECK:
                return (
                    <CredentialCheckModal
                        navigateTo={navigateTo}
                        goBack={goBack}
                        completeWorkflow={completeWorkflow}
                        modalData={modalData}
                        setModalData={setModalData}
                        {...commonProps}
                    />
                );

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