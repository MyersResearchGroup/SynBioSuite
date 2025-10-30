import LandingPage from './pages/LandingPage';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CloudHome from './pages/CloudHome';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/cloud-home" element={<CloudHome />} />
                <Route path="/" element={<LandingPage />}/>
            </Routes>
        </BrowserRouter>
    );
}