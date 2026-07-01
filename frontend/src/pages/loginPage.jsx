import { useState } from 'react';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Stack } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { showNotification, cleanNotifications } from '@mantine/notifications';
import { SBHLogin } from '../API';

export default function LoginPage() {
    const navigate = useNavigate();
    const [url, setUrl] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!url || !email || !password) {
            showNotification({
                title: 'Missing fields',
                message: 'Please fill in all fields.',
                color: 'red',
            });
            return;
        }

        setLoading(true);
        try {
            const token = await SBHLogin(url, email, password);

            // fetch profile to get full user info
            const profileRes = await fetch(`${url}/profile`, {
                headers: { 'X-authorization': token }
            });
            const profile = await profileRes.json();

            // write into localStorage the same shape the existing system uses
            const existingData = JSON.parse(localStorage.getItem('SynbioHub') || '[]');
            const newInstance = {
                registryURL: url,
                registryAPI: url,
                registryPrefix: url,
                name: profile.name || '',
                username: profile.username || email,
                email: profile.email || email,
                affiliation: profile.affiliation || '',
                authtoken: token,
            };

            // replace if already exists, otherwise add
            const updated = existingData.filter(i => i.registryURL !== url);
            updated.push(newInstance);
            localStorage.setItem('SynbioHub', JSON.stringify(updated));
            localStorage.setItem('SynbioHubPrimary', url);

            cleanNotifications();
            showNotification({
                title: 'Logged in',
                message: `Connected to ${url}`,
                color: 'green',
            });

            navigate('/local');
        } catch (error) {
            cleanNotifications();
            showNotification({
                title: 'Login failed',
                message: 'Check your credentials and instance URL.',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper shadow="md" p="xl" style={{ maxWidth: 400, margin: '10vh auto' }}>
            <Title order={3} mb="md">Sign in to SynBioSuite</Title>
            <Stack>
                <TextInput
                    label="SynBioHub Instance URL"
                    placeholder="https://synbiohub.org"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                />
                <TextInput
                    label="Email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
                <PasswordInput
                    label="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <Button onClick={handleLogin} loading={loading} fullWidth>
                    Sign In
                </Button>
            </Stack>
        </Paper>
    );
}