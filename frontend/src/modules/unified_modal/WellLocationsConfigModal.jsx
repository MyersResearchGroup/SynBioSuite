import { useState, useRef } from 'react';
import {
    Stack,
    Group,
    Button,
    Tabs,
    Text,
    Paper,
    Textarea,
    FileInput,
    Alert,
    Divider,
} from '@mantine/core';
import { FaCheck, FaExclamationTriangle, FaUpload } from 'react-icons/fa';
import { showNotification } from '@mantine/notifications';

export default function WellLocationsConfigModal({
    navigateTo,
    goBack,
    completeWorkflow,
    onCancel,
    modalData = {},
}) {
    const [activeTab, setActiveTab] = useState('manual');
    const [manualConfig, setManualConfig] = useState(modalData.manualConfig || '');
    const [configFile, setConfigFile] = useState(null);
    const [additionalFile, setAdditionalFile] = useState(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const additionalFileInputRef = useRef(null);

    const handleConfigFileSelect = (file) => {
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            setError('Please select a valid JSON file for configuration');
            showNotification({
                title: 'Invalid File Type',
                message: 'Configuration file must be a JSON file',
                color: 'red',
                icon: <FaExclamationTriangle />,
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                JSON.parse(content); // Validate JSON
                setConfigFile({
                    name: file.name,
                    content: content,
                });
                setError('');
                showNotification({
                    title: 'Configuration File Loaded',
                    message: `Successfully loaded ${file.name}`,
                    color: 'green',
                    icon: <FaCheck />,
                });
            } catch (err) {
                setError('Invalid JSON file. Please check the file format.');
                showNotification({
                    title: 'Invalid JSON',
                    message: 'The file contains invalid JSON',
                    color: 'red',
                    icon: <FaExclamationTriangle />,
                });
            }
        };
        reader.readAsText(file);
    };

    const handleAdditionalFileSelect = (file) => {
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            setError('Please select a valid JSON file');
            showNotification({
                title: 'Invalid File Type',
                message: 'Additional file must be a JSON file',
                color: 'red',
                icon: <FaExclamationTriangle />,
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                JSON.parse(content); // Validate JSON
                setAdditionalFile({
                    name: file.name,
                    content: content,
                });
                setError('');
                showNotification({
                    title: 'Additional File Loaded',
                    message: `Successfully loaded ${file.name}`,
                    color: 'green',
                    icon: <FaCheck />,
                });
            } catch (err) {
                setError('Invalid JSON file. Please check the file format.');
                showNotification({
                    title: 'Invalid JSON',
                    message: 'The file contains invalid JSON',
                    color: 'red',
                    icon: <FaExclamationTriangle />,
                });
            }
        };
        reader.readAsText(file);
    };

    const handleSubmit = () => {
        let configData = null;

        if (activeTab === 'manual') {
            if (!manualConfig.trim()) {
                setError('Please enter configuration values');
                return;
            }
            try {
                configData = JSON.parse(manualConfig);
            } catch (err) {
                setError('Invalid JSON format in configuration');
                return;
            }
        } else if (activeTab === 'upload') {
            if (!configFile) {
                setError('Please upload a configuration file');
                return;
            }
            try {
                configData = JSON.parse(configFile.content);
            } catch (err) {
                setError('Invalid JSON in configuration file');
                return;
            }
        }

        completeWorkflow({
            wellLocationsConfig: configData,
            configFile: configFile ? configFile.name : null,
            additionalFile: additionalFile ? additionalFile.name : null,
            additionalFileContent: additionalFile ? additionalFile.content : null,
            configSource: activeTab,
        });
    };

    return (
        <Stack spacing="md">
            <Text size="sm" color="dimmed">
                Configure well locations and advanced settings for your automated build workflow.
            </Text>

            {error && (
                <Alert icon={<FaExclamationTriangle />} title="Error" color="red">
                    {error}
                </Alert>
            )}

            <Tabs value={activeTab} onTabChange={setActiveTab}>
                <Tabs.List grow>
                    <Tabs.Tab value="manual">Manual Input</Tabs.Tab>
                    <Tabs.Tab value="upload">Upload JSON</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="manual" pt="md">
                    <Stack spacing="md">
                        <div>
                            <Text size="sm" weight={500} mb="xs">
                                Configuration (JSON format)
                            </Text>
                            <Textarea
                                placeholder={`{\n  "wellLocations": {\n    "well1": "A1",\n    "well2": "A2"\n  }\n}`}
                                value={manualConfig}
                                onChange={(e) => {
                                    setManualConfig(e.currentTarget.value);
                                    setError('');
                                }}
                                minRows={8}
                                styles={{ input: { fontFamily: 'monospace', fontSize: '12px' } }}
                            />
                        </div>
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="upload" pt="md">
                    <Stack spacing="md">
                        <div>
                            <Text size="sm" weight={500} mb="xs">
                                Upload Configuration File
                            </Text>
                            <FileInput
                                ref={fileInputRef}
                                accept=".json"
                                label="Select JSON configuration file"
                                placeholder="Click to select file"
                                onChange={handleConfigFileSelect}
                                icon={<FaUpload />}
                            />
                            {configFile && (
                                <Paper p="sm" mt="sm" bg="green.0" radius="md">
                                    <Group>
                                        <FaCheck color="green" />
                                        <div style={{ flex: 1 }}>
                                            <Text size="sm" weight={500}>
                                                {configFile.name}
                                            </Text>
                                            <Text size="xs" color="dimmed">
                                                Configuration loaded
                                            </Text>
                                        </div>
                                        <Button
                                            size="xs"
                                            variant="subtle"
                                            color="red"
                                            onClick={() => setConfigFile(null)}
                                        >
                                            Clear
                                        </Button>
                                    </Group>
                                </Paper>
                            )}
                        </div>
                    </Stack>
                </Tabs.Panel>
            </Tabs>

            <Divider />

            <div>
                <Text size="sm" weight={500} mb="xs">
                    Additional Configuration File (Optional)
                </Text>
                <Text size="xs" color="dimmed" mb="xs">
                    Upload any additional JSON file for supplementary configuration
                </Text>
                <FileInput
                    ref={additionalFileInputRef}
                    accept=".json"
                    label="Select additional JSON file"
                    placeholder="Click to select file"
                    onChange={handleAdditionalFileSelect}
                    icon={<FaUpload />}
                />
                {additionalFile && (
                    <Paper p="sm" mt="sm" bg="blue.0" radius="md">
                        <Group>
                            <FaCheck color="blue" />
                            <div style={{ flex: 1 }}>
                                <Text size="sm" weight={500}>
                                    {additionalFile.name}
                                </Text>
                                <Text size="xs" color="dimmed">
                                    Additional file loaded
                                </Text>
                            </div>
                            <Button
                                size="xs"
                                variant="subtle"
                                color="red"
                                onClick={() => setAdditionalFile(null)}
                            >
                                Clear
                            </Button>
                        </Group>
                    </Paper>
                )}
            </div>

            <Group position="apart" mt="xl">
                <Button variant="default" onClick={goBack}>
                    Back
                </Button>
                <Group spacing="sm">
                    <Button variant="subtle" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} color="green">
                        Save Configuration
                    </Button>
                </Group>
            </Group>
        </Stack>
    );
}
