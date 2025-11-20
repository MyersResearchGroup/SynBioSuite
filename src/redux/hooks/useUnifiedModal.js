import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { openUnifiedModal, closeUnifiedModal, clearPendingCallback } from '../slices/modalSlice';
import { MODAL_TYPES } from '../../modules/unified_modal/unifiedModal';

/**
 * Custom hook for using the unified modal system
 * 
 * @returns {object} Modal control functions and state
 */
export function useUnifiedModal() {
    const dispatch = useDispatch();
    
    const isOpen = useSelector(state => state.modal.unifiedModalOpen);
    const modalType = useSelector(state => state.modal.unifiedModalType);
    const allowedModals = useSelector(state => state.modal.unifiedModalAllowed);
    const modalProps = useSelector(state => state.modal.unifiedModalProps);
    const pendingCallback = useSelector(state => state.modal._pendingCallback);
    const pendingCallbackData = useSelector(state => state.modal._pendingCallbackData);

    // Handle pending callback execution
    useEffect(() => {
        if (pendingCallback && typeof pendingCallback === 'function') {
            // Execute callback in next tick to avoid reducer side effects
            const timer = setTimeout(() => {
                try { pendingCallback(pendingCallbackData); } catch (e) { console.error('Pending callback error:', e); }
                dispatch(clearPendingCallback());
            }, 0);
            
            return () => clearTimeout(timer);
        }
    }, [pendingCallback, pendingCallbackData, dispatch]);

    /**
     * Open unified modal with specific configuration
     * 
     * @param {string} initialModal - Initial modal type (MODAL_TYPES constant)
     * @param {object} options - Configuration options
     * @param {Array<string>} options.allowedModals - Array of allowed modal types
     * @param {object} options.props - Props to pass to modal
     * @param {function} options.onComplete - Callback when modal completes
     */
    const open = useCallback((initialModal, options = {}) => {
        const {
            allowedModals = Object.values(MODAL_TYPES),
            props = {},
            onComplete = null,
        } = options;

        dispatch(openUnifiedModal({
            modalType: initialModal,
            allowedModals,
            props,
            callback: onComplete,
        }));
    }, [dispatch]);

    /**
     * Close the unified modal
     */
    const close = useCallback(() => {
        dispatch(closeUnifiedModal());
    }, [dispatch]);

    /**
     * Quick access functions for common workflows
     */
    const workflows = {
        /**
         * Open SynBioHub login workflow
         * Allows: SBH_LOGIN -> ADD_SBH_REPO
         */
        loginToSBH: useCallback((onComplete) => {
            open(MODAL_TYPES.SBH_LOGIN, {
                allowedModals: [MODAL_TYPES.SBH_LOGIN, MODAL_TYPES.ADD_SBH_REPO],
                onComplete,
            });
        }, [open]),

        /**
         * Open Flapjack login workflow
         * Allows: FJ_LOGIN -> ADD_FJ_REPO
         */
        loginToFJ: useCallback((onComplete) => {
            open(MODAL_TYPES.FJ_LOGIN, {
                allowedModals: [MODAL_TYPES.FJ_LOGIN, MODAL_TYPES.ADD_FJ_REPO],
                onComplete,
            });
        }, [open]),

        /**
         * Open both SBH and FJ login workflow chooser
         * Allows switching between SBH and FJ login and adding repos for either
         */
        loginToSBHAndFJ: useCallback((onComplete) => {
            open(MODAL_TYPES.SBH_LOGIN, {
                allowedModals: [
                    MODAL_TYPES.SBH_LOGIN,
                    MODAL_TYPES.FJ_LOGIN,
                    MODAL_TYPES.ADD_SBH_REPO,
                    MODAL_TYPES.ADD_FJ_REPO,
                ],
                onComplete,
            });
        }, [open]),

        /**
         * Open create collection workflow
         * Allows: CREATE_COLLECTION -> SBH_LOGIN -> ADD_SBH_REPO
         */
        createCollection: useCallback((libraryName, libraryDescription, onComplete) => {
            open(MODAL_TYPES.CREATE_COLLECTION, {
                allowedModals: [
                    MODAL_TYPES.CREATE_COLLECTION, 
                    MODAL_TYPES.SBH_LOGIN, 
                    MODAL_TYPES.ADD_SBH_REPO
                ],
                props: { libraryName, libraryDescription },
                onComplete,
            });
        }, [open]),

        /**
         * Open add repository workflow (SBH or FJ)
         */
        addRepository: useCallback((repoType, onComplete) => {
            const modalType = repoType === 'sbh' 
                ? MODAL_TYPES.ADD_SBH_REPO 
                : MODAL_TYPES.ADD_FJ_REPO;
            
            open(modalType, {
                allowedModals: [modalType],
                onComplete,
            });
        }, [open]),

        /**
         * Open instance selector (for selecting existing repos)
         */
        selectInstance: useCallback((repoType, onComplete) => {
            const modalType = repoType === 'sbh'
                ? MODAL_TYPES.SBH_INSTANCE_SELECTOR
                : MODAL_TYPES.FJ_INSTANCE_SELECTOR;
            
            const allowedModals = repoType === 'sbh'
                ? [MODAL_TYPES.SBH_INSTANCE_SELECTOR, MODAL_TYPES.SBH_LOGIN, MODAL_TYPES.ADD_SBH_REPO]
                : [MODAL_TYPES.FJ_INSTANCE_SELECTOR, MODAL_TYPES.FJ_LOGIN, MODAL_TYPES.ADD_FJ_REPO];
            
            open(modalType, {
                allowedModals,
                onComplete,
            });
        }, [open]),

        /**
         * Open collection browser workflow
         * Steps: REPOSITORY_SELECTOR -> SBH_CREDENTIAL_CHECK -> COLLECTION_BROWSER
         * 
         * @param {function} onComplete - Callback function that receives selected collections
         * @param {object} props - Optional props for initial configuration
         * 
         * The callback receives data only when the entire workflow completes:
         * {
         *   repository: { uri, name, ... },
         *   collections: [{ uri, name, displayId, ... }],
         *   count: number,
         *   completed: true
         * }
         */
        browseCollections: useCallback((onComplete, props = {}) => {
            open(MODAL_TYPES.REPOSITORY_SELECTOR, {
                allowedModals: [
                    MODAL_TYPES.REPOSITORY_SELECTOR,
                    MODAL_TYPES.SBH_CREDENTIAL_CHECK,
                    MODAL_TYPES.COLLECTION_BROWSER,
                    MODAL_TYPES.ADD_SBH_REPO,
                    MODAL_TYPES.SBH_LOGIN,
                ],
                props,
                onComplete,
            });
        }, [open]),

        /**
         * Open collection browser workflow for resource selection (plasmids, backbones, etc.)
         * This workflow skips repository selection and uses the provided repository.
         * Silently validates credentials first - only shows UI if there's a problem.
         * 
         * @param {string} repositoryUrl - The repository URL to use (from previous selection)
         * @param {string} expectedEmail - The email address to validate against (for cross-reference)
         * @param {function} onComplete - Callback function that receives selected collections
         * @param {object} props - Optional props for initial configuration
         * 
         * The callback receives data only when the entire workflow completes:
         * {
         *   selectedRepo: string,
         *   userInfo: { email, username, name, ... },
         *   collections: [{ uri, name, displayId, ... }],
         *   count: number,
         *   completed: true,
         *   validated: true  // indicates email was validated
         * }
         * 
         * If credentials don't match, the workflow aborts and returns:
         * {
         *   error: 'Email mismatch',
         *   expectedEmail: string,
         *   actualEmail: string,
         *   aborted: true
         * }
         */
        browseCollectionsForResource: useCallback((repositoryUrl, expectedEmail, onComplete, props = {}) => {
            open(MODAL_TYPES.COLLECTION_BROWSER, {
                allowedModals: [
                    MODAL_TYPES.SBH_CREDENTIAL_CHECK,
                    MODAL_TYPES.COLLECTION_BROWSER,
                    MODAL_TYPES.SBH_LOGIN,
                ],
                props: {
                    ...props,
                    selectedRepo: repositoryUrl,
                    expectedEmail: expectedEmail,
                    skipRepositorySelection: true,
                    silentCredentialCheck: true,
                },
                onComplete,
            });
        }, [open]),
    };

    return {
        // State
        isOpen,
        modalType,
        allowedModals,
        modalProps,
        
        // Actions
        open,
        close,
        
        // Workflows
        workflows,
        
        // Constants (for convenience)
        MODAL_TYPES,
    };
}

export default useUnifiedModal;
