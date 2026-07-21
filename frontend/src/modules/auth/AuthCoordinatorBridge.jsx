import { useEffect } from 'react';

import { useUnifiedModal } from '../../redux/hooks/useUnifiedModal.js';
import { MODAL_TYPES } from '../unified_modal/unifiedModal.jsx';
import { AuthCancelledError, authCoordinator } from './authCoordinator.js';

export default function AuthCoordinatorBridge() {
    const { open } = useUnifiedModal();

    useEffect(() => authCoordinator.setLoginRequester(({ provider, registryURL }) => (
        new Promise((resolve, reject) => {
            const isSynBioHub = provider === 'synbiohub';
            const modalType = isSynBioHub ? MODAL_TYPES.SBH_LOGIN : MODAL_TYPES.FJ_LOGIN;
            const addType = isSynBioHub ? MODAL_TYPES.ADD_SBH_REPO : MODAL_TYPES.ADD_FJ_REPO;
            open(modalType, {
                allowedModals: [modalType, addType],
                props: { selectedRepo: registryURL },
                onComplete: (data) => {
                    if (data?.completed) resolve(data);
                    else reject(new AuthCancelledError());
                },
            });
        })
    )), [open]);

    return null;
}
