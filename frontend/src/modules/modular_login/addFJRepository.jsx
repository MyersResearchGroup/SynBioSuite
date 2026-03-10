import { Modal } from '@mantine/core';
import { useState } from 'react';
import { TextInput, Button, Group, Space } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { FJLogin } from '../../API';
import { useDispatch, useSelector } from 'react-redux';
import { setFJPrimary } from '../../redux/slices/primaryRepositorySlice';

function AddFJRepository({ opened, onClose, goBack }) {    
    const [step, setStep] = useState(1);
    const [frontendURL, setFrontendURL] = useState('');
    const [backendURL, setBackendURL] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const [instanceData, setInstanceData] = useLocalStorage({ key: "Flapjack", defaultValue: [] });
    const dispatch = useDispatch();
    const selected = useSelector(state => state.primaryRepository.fjPrimary);
    const setSelected = (value) => dispatch(setFJPrimary(typeof value === 'function' ? value(selected) : value));

    const normalizeUrl = (inputUrl) => {
        let url = inputUrl.trim();
        if (!/^https?:\/\//i.test(url)) {
            url = url.replace(/^www\./i, '');
            url = `https://${url}`;
        }
        return url;
    };

    const handleSubmit = async (frontendURL, backendURL, username, password) => {
        try {
            const instanceInfo = await FJLogin(backendURL, username, password)
            if(!instanceInfo.authtoken){
                throw new Error("Invalid login. Please try again")
            }
            const uri = frontendURL;
            const exists = instanceData.some(item => item.frontendURL === uri);

            const updatedInstance = {
                frontendURL,
                backendURL,
                URI: uri,
                username: username, 
                email: instanceInfo.email,
                authtoken: instanceInfo.authtoken,
                refresh: instanceInfo.refresh 
            };

            let updatedInstanceData;
            if (exists) {
                updatedInstanceData = instanceData.map((item) =>
                    item.frontendURL === uri ? updatedInstance : item
                );
            } else {
                updatedInstanceData = [...instanceData, { ...updatedInstance }];
            }

            setInstanceData(updatedInstanceData);
            setSelected(uri);

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

    return (
        <Modal opened={opened} onClose={onClose} title="Choose Repository" size="lg">
            {step === 1 && (
                <>
                    <Group grow spacing="md">
                        <TextInput
                            label="Frontend URL"
                            placeholder="https://flapjack.org"
                            value={frontendURL}
                            onChange={(e) => setFrontendURL(e.currentTarget.value)}
                            required
                        />
                    </Group>
                    <Space h="md" />
                    <Group grow spacing="md">
                        <TextInput
                            label="Backend URL"
                            placeholder="https://flapjack.org"
                            value={backendURL}
                            onChange={(e) => setBackendURL(e.currentTarget.value)}
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
                        <Button onClick={() => setStep(2)} disabled={!frontendURL || !backendURL} ml={goBack ? undefined : "auto"}>
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
                        <Button disabled={!username || !password} onClick={() => handleSubmit(normalizeUrl(frontendURL), normalizeUrl(backendURL), username, password)}>
                            Submit
                        </Button>
                    </Group>
                </>
            )}
        </Modal>
    );
}

export default AddFJRepository;