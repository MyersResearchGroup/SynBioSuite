import { Modal } from '@mantine/core';
import { useState } from 'react';
import { TextInput, Button, Group, Space } from '@mantine/core';
import { SBHLogin } from '../../API';
import { useLocalStorage } from '@mantine/hooks';
import { showNotification, cleanNotifications } from '@mantine/notifications';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { setSBHPrimary } from '../../redux/slices/primaryRepositorySlice';

function AddSBHRepository({ opened, onClose, onSubmit, goBack }) {
    if (!opened) return null;

    const [step, setStep] = useState(1);
    const [frontendURL, setFrontendURL] = useState('');
    const [backendURL, setBackendURL] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [instanceData, setInstanceData] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const dispatch = useDispatch();
    const selected = useSelector(state => state.primaryRepository.sbhPrimary);
    const setSelected = (value) => dispatch(setSBHPrimary(typeof value === 'function' ? value(selected) : value));

    const normalizeUrl = (inputUrl) => {
        let url = inputUrl.trim();
        if (!/^https?:\/\//i.test(url)) {
            url = url.replace(/^www\./i, '');
            url = `https://${url}`;
        }
        return url;
    };

    const handleSubmit = async (frontendURL, backendURL, email, password) => {
        try {
            const response = await SBHLogin(backendURL, email, password);
            let info;

            if (response) {
                info = await axios.get(`${backendURL}/profile`, {
                    headers: {
                        'Accept': 'text/plain; charset=UTF-8',
                        "X-authorization" : `${response}`
                    }
                });
                if(info.data){
                    cleanNotifications();
                } else {
                    return
                }
            } else {
                return
            }

            const uri = frontendURL;
            const updatedInstance = {
                frontendURL,
                backendURL,
                URI: uri,
                email: info.data.email, 
                authtoken: response,
                name: info.data.name,
                username: info.data.username,
                affiliation: info.data.affiliation
            };

            const exists = instanceData.some(item => item.frontendURL === uri);

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

            // Call onSubmit if provided (for workflow continuation), otherwise onClose
            if (onSubmit) {
                onSubmit();
            } else if (onClose) {
                onClose();
            }
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
            if (onClose) onClose();
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Choose Repository" size="lg">
            {step === 1 && (
                <>
                    <Group grow spacing="md">
                        <TextInput
                            label="Frontend URL"
                            placeholder="https://synbiohub.org"
                            value={frontendURL}
                            onChange={(e) => setFrontendURL(e.currentTarget.value)}
                            required
                        />
                    </Group>
                    <Space h="md" />
                    <Group grow spacing="md">
                        <TextInput
                            label="Backend URL"
                            placeholder="https://synbiohub.org"
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
                            label="Email"
                            placeholder="Enter email"
                            value={email}
                            onChange={(e) => setEmail(e.currentTarget.value)}
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
                        <Button disabled={!email || !password} onClick={() => handleSubmit(normalizeUrl(frontendURL), normalizeUrl(backendURL), email, password)}>
                            Submit
                        </Button>
                    </Group>
                </>
            )}
        </Modal>
    );
}

export default AddSBHRepository;