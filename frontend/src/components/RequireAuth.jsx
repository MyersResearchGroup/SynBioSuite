import { Navigate } from 'react-router-dom';

export default function RequireAuth({ children }) {
    const instances = JSON.parse(localStorage.getItem('SynbioHub') || '[]');
    const primary = localStorage.getItem('SynbioHubPrimary');
    const isLoggedIn = instances.some(i => i.registryURL === primary && i.authtoken);
    return isLoggedIn ? children : <Navigate to="/login" replace />;
}