import Activities from './components/activities/Activities';
import Panels from './components/panels/Panels';
import { NotificationsProvider } from "@mantine/notifications";
import BrowserCompatiblityCatch from './components/BrowserCompatiblityCatch';
import LoginModal from './modules/modular_login/loginModal';
import { useSelector, useDispatch } from 'react-redux';

export default function App() {
    const loginModalOpened = useSelector((state) => state.loginModal.isOpen);
    const dispatch = useDispatch();

    return (
        <NotificationsProvider autoClose={5000} limit={8}>
            <Activities />
            <Panels />
            <BrowserCompatiblityCatch />
            <LoginModal
                opened={loginModalOpened}
                onClose={console.log("closing login modal")}
                repoName=""
            />
        </NotificationsProvider>
    );
}