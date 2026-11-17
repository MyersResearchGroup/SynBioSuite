import Activities from '../components/activities/Activities';
import Panels from '../components/panels/Panels';
import BrowserCompatibilityCatch from '../components/BrowserCompatibilityCatch';
import LoginModal from '../modules/modular_login/loginModal';
import { useSelector, useDispatch } from 'react-redux';
import { closeLogin } from '../redux/slices/modalSlice';
import UnifiedModal from '../modules/unified_modal/unifiedModal';

export default function LocalHome() {
    const loginModalOpened = useSelector((state) => state.modal.loginOpen);

    const unifiedModalOpen = useSelector((state) => state.modal.unifiedModalOpen);
    const unifiedModalType = useSelector((state) => state.modal.unifiedModalType);
    const unifiedModalAllowed = useSelector((state) => state.modal.unifiedModalAllowed);
    const unifiedModalProps = useSelector((state) => state.modal.unifiedModalProps);
    const unifiedModalCallback = useSelector((state) => state.modal.unifiedModalCallback);
    
    const dispatch = useDispatch();

    return (
        <>
            <Activities />
            <Panels />
            <BrowserCompatibilityCatch />
            <LoginModal
                opened={loginModalOpened}
                onClose={() => dispatch(closeLogin())}
                repoName=""
            />
            <UnifiedModal
                opened={unifiedModalOpen}
                initialModal={unifiedModalType}
                allowedModals={unifiedModalAllowed}
                onComplete={unifiedModalCallback}
                modalProps={unifiedModalProps}
            />
        </>
    );
}