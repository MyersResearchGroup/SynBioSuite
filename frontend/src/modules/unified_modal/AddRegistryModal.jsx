import { Modal, TextInput, Button, Group, Select, Stack, ActionIcon, Text } from '@mantine/core';
import { useState } from 'react';
import { showNotification } from '@mantine/notifications';
import { AiOutlinePlus, AiOutlineMinus } from 'react-icons/ai';

const URLexpression = /^(localhost|\d{1,3}(\.\d{1,3}){3}|[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]+)(:\d+)?(\/[-a-zA-Z0-9()@:%_\+.~#?&/=]*)?$/i;
const URLRegex = new RegExp(URLexpression);

const SCHEMES = [
    { value: 'https', label: 'https://' },
    { value: 'http', label: 'http://' },
];

function UrlField({ label, scheme, onSchemeChange, value, onChange, placeholder }) {
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
                placeholder={placeholder}
                style={{ flex: 1 }}
                styles={{ input: { borderRadius: '0 4px 4px 0' } }}
            />
        </Group>
    );
}

export default function AddRegistryModal({ opened, onClose, onAdd, title, existingRegistries = [], closeOnSubmit = true }) {
    const [frontendScheme, setFrontendScheme] = useState('https');
    const [frontendHost, setFrontendHost] = useState('');

    const [backendScheme, setBackendScheme] = useState('https');
    const [backendHost, setBackendHost] = useState('');

    const [showURI, setShowURI] = useState(false);
    const [uriScheme, setURIScheme] = useState('https');
    const [uriHost, setURIHost] = useState('');

    const resetState = () => {
        setFrontendScheme('https');
        setFrontendHost('');
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
            showNotification({ message: 'Enter a valid Registry URL', color: 'red' });
            return;
        }

        const registryURL = `${frontendScheme}://${trimmedFrontend}`;

        if (existingRegistries.includes(registryURL)) {
            showNotification({ message: 'A repository with this frontend URL already exists', color: 'red' });
            return;
        }

        const trimmedBackend = backendHost.trim();
        if (!trimmedBackend || !URLRegex.test(trimmedBackend)) {
            showNotification({ message: 'Enter a valid Registry API URL', color: 'red' });
            return;
        }
        const registryAPI = `${backendScheme}://${trimmedBackend}`;

        let registryPrefix = registryURL;
        if (showURI) {
            const trimmedURI = uriHost.trim();
            if (!trimmedURI || !URLRegex.test(trimmedURI)) {
                showNotification({ message: 'Enter a valid Registry Prefix', color: 'red' });
                return;
            }
            registryPrefix = `${uriScheme}://${trimmedURI}`;
        }

        onAdd({ registryURL, registryAPI, registryPrefix });
        if (closeOnSubmit) {
            handleClose();
        }
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
                    <Text size="sm" weight={500} mb={4}>Registry URL</Text>
                    <UrlField
                        scheme={frontendScheme}
                        onSchemeChange={setFrontendScheme}
                        value={frontendHost}
                        onChange={setFrontendHost}
                        placeholder="synbiohub.org"
                    />
                </div>

                <div>
                    <Text size="sm" weight={500} mb={4}>Registry API</Text>
                    <UrlField
                        scheme={backendScheme}
                        onSchemeChange={setBackendScheme}
                        value={backendHost}
                        onChange={setBackendHost}
                        placeholder="api.synbiohub.org"
                    />
                </div>

                <Group spacing="sm">
                    <Button
                        variant="subtle"
                        size="xs"
                        leftIcon={showURI ? <AiOutlineMinus /> : <AiOutlinePlus />}
                        onClick={() => setShowURI(v => {
                            if (!v) {
                                setURIScheme(frontendScheme);
                                setURIHost(frontendHost);
                            }
                            return !v;
                        })}
                    >
                        {showURI ? 'Use Registry URL as Registry Prefix' : 'Modify Registry Prefix'}
                    </Button>
                </Group>

                {showURI && (
                    <div>
                        <Text size="sm" weight={500} mb={4}>Registry Prefix</Text>
                        <UrlField
                            scheme={uriScheme}
                            onSchemeChange={setURIScheme}
                            value={uriHost}
                            onChange={setURIHost}
                            placeholder="synbiohub.org"
                        />
                        <Text size="xs" color="red" mt={4} style={{ fontSize: '12px' }}>
                            *The Registry URL and Registry Prefix should normally be the same value. These usually only differ when you are debugging using a local registry.
                        </Text>
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