import LandingPage from './pages/LandingPage';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CloudHome from './pages/CloudHome';
import LocalHome from './pages/LocalHome';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/cloud-home" element={<CloudHome />} />
                <Route path="/" element={<LandingPage />} />
                <Route path="/local-home" element={<LocalHome />} />
            </Routes>
        </BrowserRouter>
    );
}