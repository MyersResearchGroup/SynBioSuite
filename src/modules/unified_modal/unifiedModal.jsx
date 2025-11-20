import { Modal, Button, Stack, Group } from '@mantine/core';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { closeUnifiedModal } from '../../redux/slices/modalSlice';

// Import all modal components
import SBHLogin from '../modular_login/SBHOnly';
import AddSBHRepository from '../modular_login/addSBHRepository';
import AddFJRepository from '../modular_login/addFJRepository';
import CreateCollectionModal from '../CreateCollectionModal';
import SBHInstanceSelector from '../modular_login/SBHInstanceSelector';
import FJInstanceSelector from '../modular_login/FJInstanceSelector';
import RepositorySelectorModal from './RepositorySelectorModal';
import CredentialCheckModal from './CredentialCheckModal';
import CollectionBrowserModal from './CollectionBrowserModal';

/**
 * Modal Type Constants
 */
export const MODAL_TYPES = {
    SBH_LOGIN: 'sbh_login',
    FJ_LOGIN: 'fj_login',
    ADD_SBH_REPO: 'add_sbh_repo',
    ADD_FJ_REPO: 'add_fj_repo',
    CREATE_COLLECTION: 'create_collection',
    SBH_INSTANCE_SELECTOR: 'sbh_instance_selector',
    FJ_INSTANCE_SELECTOR: 'fj_instance_selector',
    DIRECTORY_SELECT: 'directory_select',
    
    // Collection browser workflow
    REPOSITORY_SELECTOR: 'repository_selector',
    SBH_CREDENTIAL_CHECK: 'sbh_credential_check',
    COLLECTION_BROWSER: 'collection_browser',
};

/**
 * Modal Navigation Flow Definitions
 * Maps which modals can navigate to which other modals
 */
const MODAL_FLOWS = {
    [MODAL_TYPES.SBH_LOGIN]: [MODAL_TYPES.ADD_SBH_REPO],
    [MODAL_TYPES.FJ_LOGIN]: [MODAL_TYPES.ADD_FJ_REPO],
    [MODAL_TYPES.ADD_SBH_REPO]: [],
    [MODAL_TYPES.ADD_FJ_REPO]: [],
    [MODAL_TYPES.CREATE_COLLECTION]: [MODAL_TYPES.SBH_LOGIN],
    [MODAL_TYPES.SBH_INSTANCE_SELECTOR]: [MODAL_TYPES.SBH_LOGIN, MODAL_TYPES.ADD_SBH_REPO],
    [MODAL_TYPES.FJ_INSTANCE_SELECTOR]: [MODAL_TYPES.FJ_LOGIN, MODAL_TYPES.ADD_FJ_REPO],
    [MODAL_TYPES.DIRECTORY_SELECT]: [],
    
    // Collection browser workflow flows
    [MODAL_TYPES.REPOSITORY_SELECTOR]: [MODAL_TYPES.ADD_SBH_REPO, MODAL_TYPES.SBH_CREDENTIAL_CHECK],
    [MODAL_TYPES.SBH_CREDENTIAL_CHECK]: [MODAL_TYPES.SBH_LOGIN, MODAL_TYPES.COLLECTION_BROWSER],
    [MODAL_TYPES.COLLECTION_BROWSER]: [MODAL_TYPES.SBH_CREDENTIAL_CHECK],
};

/**
 * Unified Modal Component
 * 
 * @param {boolean} opened - Whether the modal is open
 * @param {function} onClose - Callback when modal closes
 * @param {string} initialModal - Initial modal type to display (MODAL_TYPES constant)
 * @param {Array<string>} allowedModals - Array of allowed modal types (limits navigation)
 * @param {function} onComplete - Callback when workflow completes successfully
 * @param {object} modalProps - Additional props to pass to the current modal
 */
function UnifiedModal({ 
    opened, 
    onClose, 
    initialModal = null,
    allowedModals = Object.values(MODAL_TYPES), // Default: all modals allowed
    onComplete = null,
    modalProps = {}
}) {
    if (!opened) return null;

    const [currentModal, setCurrentModal] = useState(initialModal);
    const [modalHistory, setModalHistory] = useState([]);
    const [modalData, setModalData] = useState({});
    const completedRef = useRef(false);
    const dispatch = useDispatch();

    // Reset state when modal opens
    useEffect(() => {
        if (opened) {
            setCurrentModal(initialModal);
            setModalHistory([]);
            setModalData({});
            completedRef.current = false;
        }
    }, [opened, initialModal]);

    /**
     * Navigate to a different modal within the unified modal
     */
    const navigateTo = useCallback((modalType, data = {}) => {
        // Check if navigation is allowed
        const currentFlow = MODAL_FLOWS[currentModal] || [];
        const isAllowedByFlow = currentFlow.includes(modalType);
        const isAllowedByWorkflow = allowedModals.includes(modalType);

        if (!isAllowedByFlow) {
            console.warn(`Navigation from ${currentModal} to ${modalType} not allowed by flow`);
            return false;
        }

        if (!isAllowedByWorkflow) {
            console.warn(`Modal ${modalType} not allowed by workflow constraints`);
            return false;
        }

        // Save current modal to history
        setModalHistory(prev => [...prev, currentModal]);
        setCurrentModal(modalType);
        setModalData(prev => ({ ...prev, [modalType]: data }));
        return true;
    }, [currentModal, allowedModals]);

    /**
     * Go back to previous modal
     */
    const goBack = useCallback(() => {
        if (modalHistory.length === 0) {
            // No history, close the modal
            handleClose();
            return;
        }

        const previousModal = modalHistory[modalHistory.length - 1];
        setModalHistory(prev => prev.slice(0, -1));
        setCurrentModal(previousModal);
    }, [modalHistory]);

    /**
     * Handle modal close with callback
     */
    const handleClose = useCallback(() => {
        // Do not execute onComplete here; instead dispatch closeUnifiedModal with modal data
        // so that the pending callback and data are stored in Redux and executed outside reducers.

        // Dispatch reducer to close and store pending callback + data
        dispatch(closeUnifiedModal({ modalData }));

        // Reset local state
        setCurrentModal(initialModal);
        setModalHistory([]);
        setModalData({});

        // Optionally call parent onClose (non-essential)
        if (onClose && typeof onClose === 'function') {
            try { onClose(); } catch (e) { console.error('onClose callback error:', e); }
        }
    }, [dispatch, modalData, initialModal, onClose]);

    /**
     * Mark workflow as complete and close
     */
    const completeWorkflow = useCallback((data = {}) => {
        const merged = { ...modalData, ...data, completed: true };
        setModalData(merged);
        completedRef.current = true;
        // dispatch close with data
        dispatch(closeUnifiedModal({ modalData: merged }));

        // do local cleanup as well
        setCurrentModal(initialModal);
        setModalHistory([]);
        setModalData({});
    }, [dispatch, modalData, initialModal]);

    /**
     * Get the appropriate modal title
     */
    const getModalTitle = () => {
        switch (currentModal) {
            case MODAL_TYPES.SBH_LOGIN:
                return 'Login to SynBioHub';
            case MODAL_TYPES.FJ_LOGIN:
                return 'Login to Flapjack';
            case MODAL_TYPES.ADD_SBH_REPO:
                return 'Add SynBioHub Repository';
            case MODAL_TYPES.ADD_FJ_REPO:
                return 'Add Flapjack Repository';
            case MODAL_TYPES.CREATE_COLLECTION:
                return 'Create Collection';
            case MODAL_TYPES.SBH_INSTANCE_SELECTOR:
                return 'Select SynBioHub Instance';
            case MODAL_TYPES.FJ_INSTANCE_SELECTOR:
                return 'Select Flapjack Instance';
            case MODAL_TYPES.DIRECTORY_SELECT:
                return 'Select Directory';
            case MODAL_TYPES.REPOSITORY_SELECTOR:
                return 'Select Repository';
            case MODAL_TYPES.SBH_CREDENTIAL_CHECK:
                return 'Verify Credentials';
            case MODAL_TYPES.COLLECTION_BROWSER:
                return 'Browse Collections';
            default:
                return 'Modal';
        }
    };

    /**
     * Get the appropriate modal size
     */
    const getModalSize = () => {
        switch (currentModal) {
            case MODAL_TYPES.CREATE_COLLECTION:
            case MODAL_TYPES.ADD_SBH_REPO:
            case MODAL_TYPES.ADD_FJ_REPO:
            case MODAL_TYPES.SBH_INSTANCE_SELECTOR:
            case MODAL_TYPES.FJ_INSTANCE_SELECTOR:
                return 'xl';  // Extra large for general workflows
            case MODAL_TYPES.COLLECTION_BROWSER:
                // Return a numeric pixel width so Mantine uses a larger fixed size
                return 1200;
            case MODAL_TYPES.REPOSITORY_SELECTOR:
            case MODAL_TYPES.SBH_CREDENTIAL_CHECK:
                return 'lg';
            default:
                return 'md';
        }
    };

    // Provide custom styles for very wide modals (collection browser)
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
                body: {
                    padding: 0,
                }
            };
        }

        return undefined;
    };

    /**
     * Render the current modal content
     */
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
                // If we came from credential check, navigate back there after login
                // Otherwise, complete the workflow
                const shouldReturnToCredentialCheck = modalHistory.includes(MODAL_TYPES.SBH_CREDENTIAL_CHECK);
                
                return (
                    <SBHLogin
                        opened={true}
                        onClose={() => {
                            if (shouldReturnToCredentialCheck) {
                                // Navigate back to credential check to re-verify
                                goBack();
                            } else {
                                completeWorkflow();
                            }
                        }}
                        {...commonProps}
                    />
                );

            case MODAL_TYPES.ADD_SBH_REPO:
                // If we came from credential check or repository selector, go back there ONLY on submit, not on cancel/x
                const _shouldReturnToCredentialCheck = modalHistory.includes(MODAL_TYPES.SBH_CREDENTIAL_CHECK);
                const shouldReturnToRepoSelector = modalHistory.includes(MODAL_TYPES.REPOSITORY_SELECTOR);
                return (
                    <AddSBHRepository
                        opened={true}
                        // onClose is for cancel/x: always exit all modals
                        onClose={handleClose}
                        // onSubmit is for successful submit: go back in workflow if needed, else complete
                        onSubmit={() => {
                            if (_shouldReturnToCredentialCheck || shouldReturnToRepoSelector) {
                                goBack();
                            } else {
                                completeWorkflow();
                            }
                        }}
                        {...commonProps}
                    />
                );

            case MODAL_TYPES.ADD_FJ_REPO:
                return (
                    <AddFJRepository
                        opened={true}
                        onClose={completeWorkflow}
                        {...commonProps}
                    />
                );

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
                    <div>
                        <SBHInstanceSelector
                            onClose={completeWorkflow}
                            setRepoSelection={(selection) => {
                                setModalData(prev => ({ ...prev, selectedRepo: selection }));
                            }}
                            {...commonProps}
                        />
                    </div>
                );

            case MODAL_TYPES.FJ_INSTANCE_SELECTOR:
                return (
                    <div>
                        <FJInstanceSelector
                            onClose={completeWorkflow}
                            setRepoSelection={(selection) => {
                                setModalData(prev => ({ ...prev, selectedRepo: selection }));
                            }}
                            {...commonProps}
                        />
                    </div>
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
                        onCancel={() => handleClose()}
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

    // Don't render wrapper modal if the child modal already has its own Modal component
    const selfContainedModals = [
        MODAL_TYPES.SBH_LOGIN,
        MODAL_TYPES.ADD_SBH_REPO,
        MODAL_TYPES.ADD_FJ_REPO,
        MODAL_TYPES.CREATE_COLLECTION,
    ];

    if (selfContainedModals.includes(currentModal)) {
        // Just render the child component, it has its own Modal wrapper
        return renderModalContent();
    }

    // For modals without their own Modal wrapper, provide one
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
                
                {/* Navigation buttons */}
                <Group position="apart" mt="xl">
                    {modalHistory.length > 0 && (
                        <Button variant="default" onClick={goBack}>
                            Back
                        </Button>
                    )}
                    <Button variant="subtle" onClick={handleClose} ml="auto">
                        Cancel
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

export default UnifiedModal;