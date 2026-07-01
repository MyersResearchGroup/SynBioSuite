import { useState } from 'react';
import { Button, Center, Text, Avatar, Group, useMantineTheme, Container } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import LoginModal from '../modules/modular_login/loginModal';

export default function LoginStatus() {
    const theme = useMantineTheme();
    const navigate = useNavigate();
    const [modalOpened, setModalOpened] = useState(false);

    // pull current user from localStorage
    const primary = localStorage.getItem('SynbioHubPrimary');
    const instances = JSON.parse(localStorage.getItem('SynbioHub') || '[]');
    const user = instances.find(i => i.registryURL === primary);

    const handleLogout = () => {
        localStorage.removeItem('SynbioHubPrimary');
        const updated = instances.map(i =>
            i.registryURL === primary ? { ...i, authtoken: '' } : i
        );
        localStorage.setItem('SynbioHub', JSON.stringify(updated));
        navigate('/login');
    };

    return (
        <Center style={{
            height: '100vh',
            background: `radial-gradient(${theme.colors.dark[6]}, ${theme.colors.dark[7]})`
        }}>
            <Container>
                <Avatar
                    size={94}
                    radius="md"
                />
                <div>
                    <Text fz="xs" tt="uppercase" fw={700} c="dimmed">
                        {user?.name || 'Unknown'}
                    </Text>
                    <Text fz="lg" fw={500}>
                        {user?.username || '—'}
                    </Text>
                    <Group noWrap spacing={10} mt={3}>
                        <Text fz="xs" c="dimmed">
                            {user?.email || '—'}
                        </Text>
                    </Group>
                    <Group noWrap spacing={10} mt={5}>
                        <Text fz="xs" c="dimmed">
                            {user?.affiliation || '—'}
                        </Text>
                    </Group>
                    <Group mt="md" spacing="sm">
                        <Button onClick={() => setModalOpened(true)}>
                            Manage Instances
                        </Button>
                        <Button color="red" variant="outline" onClick={handleLogout}>
                            Log Out
                        </Button>
                    </Group>
                </div>
                <LoginModal
                    opened={modalOpened}
                    repoName="SynbioHub"
                    onClose={() => setModalOpened(false)}
                />
            </Container>
        </Center>
    );
}