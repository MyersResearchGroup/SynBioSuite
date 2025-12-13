import LandingPage from './pages/LandingPage';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CloudHome from './pages/CloudHome';
import LocalHome from './pages/LocalHome';
import { LoadingOverlay } from '@mantine/core';

export default function App() {
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
        <BrowserRouter>
            <LoadingOverlay
                loaderProps={{ size: 'lg', color: 'pink', variant: 'bars' }}
                overlayOpacity={.8}
                overlayColor="#c5c5c5"
                visible={visible}
            />
            <Routes>
                <Route path="/cloud-home" element={<CloudHome />} />
                <Route path="/" element={<LandingPage />} />
                <Route path="/local-home" element={<LocalHome />} />
            </Routes>
        </BrowserRouter>
    );
}