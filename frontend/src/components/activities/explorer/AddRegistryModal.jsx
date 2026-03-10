import { Modal, TextInput, Button, Group, Select, Stack, ActionIcon, Text } from '@mantine/core';
import { useState } from 'react';
import { showNotification } from '@mantine/notifications';
import { AiOutlinePlus, AiOutlineMinus } from 'react-icons/ai';

const URLexpression = /^[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;
const URLRegex = new RegExp(URLexpression);

const SCHEMES = [
    { value: 'https', label: 'https://' },
    { value: 'http', label: 'http://' },
];

function UrlField({ label, scheme, onSchemeChange, value, onChange }) {
    return (
        <Group spacing={0} align="flex-end" noWrap>
            <Select
                data={SCHEMES}
                value={scheme}
                onChange={onSchemeChange}
                styles={{
                    root: { width: 110, flexShrink: 0 },
                    input: { borderRadius: '4px 0 0 4px', borderRight: 'none' },
                }}
                withinPortal
            />
            <TextInput
                label={label}
                value={value}
                onChange={(e) => onChange(e.currentTarget.value)}
                placeholder="example.com"
                style={{ flex: 1 }}
                styles={{ input: { borderRadius: '0 4px 4px 0' } }}
            />
        </Group>
    );
}

export default function AddRegistryModal({ opened, onClose, onAdd, title, existingRegistries = [] }) {
    const [frontendScheme, setFrontendScheme] = useState('https');
    const [frontendHost, setFrontendHost] = useState('');

    const [showBackend, setShowBackend] = useState(false);
    const [backendScheme, setBackendScheme] = useState('https');
    const [backendHost, setBackendHost] = useState('');

    const [showURI, setShowURI] = useState(false);
    const [uriScheme, setURIScheme] = useState('https');
    const [uriHost, setURIHost] = useState('');

    const resetState = () => {
        setFrontendScheme('https');
        setFrontendHost('');
        setShowBackend(false);
        setBackendScheme('https');
        setBackendHost('');
        setShowURI(false);
        setURIScheme('https');
        setURIHost('');
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleSubmit = () => {
        const trimmedFrontend = frontendHost.trim();
        if (!trimmedFrontend || !URLRegex.test(trimmedFrontend)) {
            showNotification({ message: 'Enter a valid frontend URL', color: 'red' });
            return;
        }

        const frontendURL = `${frontendScheme}://${trimmedFrontend}`;

        if (existingRegistries.includes(frontendURL)) {
            showNotification({ message: 'A repository with this frontend URL already exists', color: 'red' });
            return;
        }

        let backendURL = frontendURL;
        if (showBackend) {
            const trimmedBackend = backendHost.trim();
            if (!trimmedBackend || !URLRegex.test(trimmedBackend)) {
                showNotification({ message: 'Enter a valid backend URL', color: 'red' });
                return;
            }
            backendURL = `${backendScheme}://${trimmedBackend}`;
        }

        let URI = frontendURL;
        if (showURI) {
            const trimmedURI = uriHost.trim();
            if (!trimmedURI || !URLRegex.test(trimmedURI)) {
                showNotification({ message: 'Enter a valid URI', color: 'red' });
                return;
            }
            URI = `${uriScheme}://${trimmedURI}`;
        }

        onAdd({ frontendURL, backendURL, URI });
        handleClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={`Add New ${title}`}
            size="md"
        >
            <Stack spacing="md">
                <div>
                    <Text size="sm" weight={500} mb={4}>Frontend URL</Text>
                    <UrlField
                        scheme={frontendScheme}
                        onSchemeChange={setFrontendScheme}
                        value={frontendHost}
                        onChange={setFrontendHost}
                    />
                </div>

                <Group spacing="sm">
                    <Button
                        variant="subtle"
                        size="xs"
                        leftIcon={showBackend ? <AiOutlineMinus /> : <AiOutlinePlus />}
                        onClick={() => setShowBackend(v => !v)}
                    >
                        {showBackend ? 'Remove Backend URL' : 'Modify Backend URL'}
                    </Button>
                    <Button
                        variant="subtle"
                        size="xs"
                        leftIcon={showURI ? <AiOutlineMinus /> : <AiOutlinePlus />}
                        onClick={() => setShowURI(v => !v)}
                    >
                        {showURI ? 'Remove URI' : 'Modify URI'}
                    </Button>
                </Group>

                {showBackend && (
                    <div>
                        <Text size="sm" weight={500} mb={4}>Backend URL</Text>
                        <UrlField
                            scheme={backendScheme}
                            onSchemeChange={setBackendScheme}
                            value={backendHost}
                            onChange={setBackendHost}
                        />
                    </div>
                )}

                {showURI && (
                    <div>
                        <Text size="sm" weight={500} mb={4}>URI</Text>
                        <UrlField
                            scheme={uriScheme}
                            onSchemeChange={setURIScheme}
                            value={uriHost}
                            onChange={setURIHost}
                        />
                    </div>
                )}

                <Group position="right" mt="sm">
                    <Button variant="default" onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Add</Button>
                </Group>
            </Stack>
        </Modal>
    );
}
