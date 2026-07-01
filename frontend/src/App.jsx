import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LocalHome from './pages/LocalHome';
import { LoadingOverlay } from '@mantine/core';
import { useSelector } from 'react-redux';
import RequireAuth from './components/RequireAuth';

export default function App() {
    const visible = useSelector((state) => state.overlay.loadingOverlay)

    return (
        <BrowserRouter>
            <LoadingOverlay
                loaderProps={{ size: 'lg', color: 'blue', variant: 'bars' }}
                overlayOpacity={.8}
                overlayColor="#454545"
                visible={visible}
            />
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/local" element={<RequireAuth><LocalHome /></RequireAuth>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}