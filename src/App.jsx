import Activities from './components/activities/Activities';
import Panels from './components/panels/Panels';
import { NotificationsProvider } from "@mantine/notifications";
import BrowserCompatiblityCatch from './components/BrowserCompatiblityCatch';
import LoginModal from './modules/modular_login/loginModal';
import { useSelector, useDispatch } from 'react-redux';
import { closeModal, closeSBH, closeFJ, openDirectory, closeDirectory } from './redux/slices/modalSlice';
import FJModal from './modules/modular_login/FJModal';
import SBHModal from './modules/modular_login/SBHModal';
import { Modal } from '@mantine/core';
import DirectoryModal from './modules/directory_modal/directoryModal';

export default function App() {
    const loginModalOpened = useSelector((state) => state.modal.bothOpen);
    const sbhModalOpened = useSelector((state) => state.modal.sbhOpen);
    const fjModalOpened = useSelector((state) => state.modal.fjOpen);
    const directoryModalOpened = useSelector((state) => state.modal.directoryOpen);
    const dispatch = useDispatch();

    return (
        <NotificationsProvider autoClose={5000} limit={8}>
            <Activities />
            <Panels />
            <BrowserCompatiblityCatch />
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
        </NotificationsProvider>
    );
}