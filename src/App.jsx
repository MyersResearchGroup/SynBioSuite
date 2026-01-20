import LandingPage from './pages/LandingPage';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CloudHome from './pages/CloudHome';
import LocalHome from './pages/LocalHome';
import { LoadingOverlay } from '@mantine/core';
import { useSelector } from 'react-redux'

export default function App() {
    const visible = useSelector((state) => state.overlay.loadingOverlay)

    return (
        <BrowserRouter>
            <LoadingOverlay
                loaderProps={{ size: 'lg', color: 'pink', variant: 'bars' }}
                overlayOpacity={.8}
                overlayColor="#c5c5c5"
                visible={visible}
            />
            <Routes>
                <Route path="/onedrive" element={<CloudHome />} />
                <Route path="/" element={<LandingPage />} />
                <Route path="/local" element={<LocalHome />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}