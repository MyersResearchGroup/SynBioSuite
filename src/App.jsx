import Activities from './components/activities/Activities';
import Panels from './components/panels/Panels';
import { NotificationsProvider } from "@mantine/notifications";
import BrowserCompatiblityCatch from './components/BrowserCompatiblityCatch';
import LoginModal from './modules/modular_login/loginModal';
import { useSelector, useDispatch } from 'react-redux';
import { closeModal, closeSBH, closeFJ, closeAddSBHrepository, closeAddFJrepository, closeCreateCollection, closeSBHLogin, closeUnifiedModal } from './redux/slices/modalSlice';
import FJModal from './modules/modular_login/FJModal';
import SBHModal from './modules/modular_login/SBHModal';
import AddSBHRepository from './modules/modular_login/addSBHRepository';
import AddFJRepository from './modules/modular_login/addFJRepository';
import CreateCollectionModal from './modules/CreateCollectionModal';
import SBHOnly from './modules/modular_login/SBHOnly';
import { LoadingOverlay } from '@mantine/core';
import UnifiedModal from './modules/unified_modal/unifiedModal';


export default function App() {
    const unifiedModalOpen = useSelector((state) => state.modal.unifiedModalOpen)
    const unifiedModalType = useSelector((state) => state.modal.unifiedModalType)
    const unifiedModalAllowed = useSelector((state) => state.modal.unifiedModalAllowed)
    const unifiedModalProps = useSelector((state) => state.modal.unifiedModalProps)

    const loginModalOpened = useSelector((state) => state.modal.bothOpen);
    const sbhModalOpened = useSelector((state) => state.modal.sbhOpen);
    const fjModalOpened = useSelector((state) => state.modal.fjOpen);

    const addSBHRepositoryOpened = useSelector((state) => state.modal.addSBHrepository);
    const addFJRepositoryOpened = useSelector((state) => state.modal.addFJrepository)
    
    const collectionModalOpened = useSelector((state) => state.modal.addCollections)
    
    const SBHOnlyOpened = useSelector((state) => state.modal.sbhLoginOpen)

    const libraryName = useSelector((state) => state.modal.libraryName)
    const libraryDescription = useSelector((state) => state.modal.libraryDescription)

    const visible = useSelector((state) => state.overlay.loadingOverlay)

    const dispatch = useDispatch();

    return (
        <NotificationsProvider autoClose={5000} limit={8}>
            <LoadingOverlay
                loaderProps={{ size: 'lg', color: 'pink', variant: 'bars' }}
                overlayOpacity={.8}
                overlayColor="#c5c5c5"
                visible={visible}
            />
            <Activities />
            <Panels />
            <BrowserCompatiblityCatch />
            <UnifiedModal
                opened={unifiedModalOpen}
                onClose={() => dispatch(closeUnifiedModal())}
                initialModal={unifiedModalType}
                allowedModals={unifiedModalAllowed}
                modalProps={unifiedModalProps}
            />
            <LoginModal
                opened={loginModalOpened}
                onClose={() => dispatch(closeModal())}
                repoName=""
            />
            <SBHModal
                opened={sbhModalOpened}
                onClose={() => dispatch(closeSBH())}
                repoName=""
            />
            <FJModal
                opened={fjModalOpened}
                onClose={() => dispatch(closeFJ())}
                repoName=""
            />
            <FJModal
                opened={fjModalOpened}
                onClose={() => dispatch(closeFJ())}
                repoName=""
            />
            <AddSBHRepository 
                opened={addSBHRepositoryOpened}
                onClose={() => dispatch(closeAddSBHrepository())}
            />
            <AddFJRepository
                opened={addFJRepositoryOpened}
                onClose={() => dispatch(closeAddFJrepository())}
            />
            <CreateCollectionModal 
                opened={collectionModalOpened}
                libraryName={libraryName}
                libraryDescription={libraryDescription}
                onClose={() => dispatch(closeCreateCollection())}
            />
            <SBHOnly
                opened={SBHOnlyOpened}
                onClose={() => dispatch(closeSBHLogin())}
            />
        </NotificationsProvider>
    );
}