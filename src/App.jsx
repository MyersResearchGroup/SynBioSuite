import Activities from './components/activities/Activities';
import Panels from './components/panels/Panels';
import { NotificationsProvider } from "@mantine/notifications";
import BrowserCompatiblityCatch from './components/BrowserCompatiblityCatch';
import LoginModal from './modules/modular_login/loginModal';
import { useSelector, useDispatch } from 'react-redux';
import { closeModal, closeSBH, closeFJ } from './redux/slices/loginModalSlice';
import FJModal from './modules/modular_login/FJModal';
import SBHModal from './modules/modular_login/SBHModal';

export default function App() {
    const loginModalOpened = useSelector((state) => state.loginModal.isOpen);
    const sbhModalOpened = useSelector((state) => state.loginModal.sbhOpen);
    const fjModalOpened = useSelector((state) => state.loginModal.fjOpen);
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