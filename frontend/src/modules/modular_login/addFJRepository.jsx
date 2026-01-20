import { Modal } from '@mantine/core';
import { useState } from 'react';
import { TextInput, Button, Group, Space } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { FJLogin } from '../../API';

function AddFJRepository({ opened, onClose, goBack }) {    
    const [step, setStep] = useState(1);
    const [url, setUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const [instanceData, setInstanceData] = useLocalStorage({ key: "Flapjack", defaultValue: [] });
    const [selected, setSelected] = useLocalStorage({ key: "Flapjack-Primary", defaultValue: "" });

    const handleSubmit = async (url, username, password) => {
        try {
            const instanceInfo = await FJLogin(url, username, password)
            if(!instanceInfo.authtoken){
                throw new Error("Invalid login. Please try again")
            }
            const exists = instanceData.some(item => item.instance === url);

            const updatedInstance = { 
                value: url, 
                label: url,
                instance: url, 
                username: username, 
                email: instanceInfo.email,
                authtoken: instanceInfo.authtoken,
                refresh: instanceInfo.refresh 
            };

            let updatedInstanceData;
            if (exists) {
                updatedInstanceData = instanceData.map((item) =>
                    item.instance === url ? updatedInstance : item
                );
            } else {
                updatedInstanceData = [...instanceData, { ...updatedInstance }];
            }

            setInstanceData(updatedInstanceData);
            setSelected(url);

            showNotification({
                title: 'Login successful',
                message: 'You have successfully logged in.',
                color: 'green',
            });

            onClose()
        } catch (error) {
            console.error('Login failed:', error);
            if(error.status === 401){
                showNotification({
                    title: 'Login failed',
                    message: 'Please check your credentials and try again.',
                    color: 'red',
                });
            } else {
                showNotification({
                    title: 'Login failed',
                    message: 'An error occurred. Please try again and make sure your repository is online.',
                    color: 'red',
                });
            }
            onClose()
        }
    };

    // Helper to remove http://, https://, and www. in the input of the URL
    const cleanUrl = (inputUrl) => {
        return inputUrl.replace(/^(https?:\/\/)?(www\.)?/, '');
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Choose Repository" size="lg">
            {step === 1 && (
                <>
                    <Group grow spacing="md">
                        <TextInput
                            label="Repository URL"
                            placeholder="Enter repository URL"
                            value={url}
                            onChange={(e) => setUrl(e.currentTarget.value)}
                            required
                        />
                    </Group>
                    <Space h="xl" />
                    <Group position="apart">
                        {goBack && (
                            <Button variant="default" onClick={goBack}>
                                Back
                            </Button>
                        )}
                        <Button onClick={() => setStep(2)} disabled={!url} ml={goBack ? undefined : "auto"}>
                            Next
                        </Button>
                    </Group>
                </>
            )}
            {step === 2 && (
                <>
                    <Group grow spacing="md">
                        <TextInput
                            label="Username"
                            placeholder="Enter username"
                            value={username}
                            onChange={(e) => setUsername(e.currentTarget.value)}
                            required
                        />
                    </Group>
                    <Space h="md" />
                    <Group grow spacing="md">
                        <TextInput
                            label="Password"
                            placeholder="Enter password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.currentTarget.value)}
                            required
                        />
                    </Group>
                    <Space h="xl" />
                    <Group position="center" spacing="md">
                        <Button variant="default" onClick={() => setStep(1)}>
                            Back
                        </Button>
                        <Button disabled={!username || !password} onClick={() => handleSubmit(cleanUrl(url), username, password)}>
                            Submit
                        </Button>
                    </Group>
                </>
            )}
        </Modal>
    );
}

export default AddFJRepository;