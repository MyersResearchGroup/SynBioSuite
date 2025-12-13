import { Modal } from '@mantine/core';
import { useState } from 'react';
import { TextInput, Button, Group, Space } from '@mantine/core';
import { SBHLogin } from '../../API';
import { useLocalStorage } from '@mantine/hooks';
import { showNotification, cleanNotifications } from '@mantine/notifications';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { closeAddSBHrepository } from '../../redux/slices/modalSlice';


function AddSBHRepository({ opened, onClose }) {
    if (!opened) return null;

    const dispatch = useDispatch();

    const [step, setStep] = useState(1);
    const [url, setUrl] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [instanceData, setInstanceData] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [selected, setSelected] = useLocalStorage({ key: "SynbioHub-Primary", defaultValue: "" });

    const handleSubmit = async (url, email, password) => {
        try {
            const response = await SBHLogin(url, email, password);
            let info;

            if (response) {
                info = await axios.get(`https://${url}/profile`, {
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

            const updatedInstance = { 
                value: url, 
                label: url,
                instance: url, 
                email: info.data.email, 
                authtoken: response,
                name: info.data.name,
                username: info.data.username,
                affiliation: info.data.affiliation
            };

            const exists = instanceData.some(item => item.instance === url);

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

            dispatch(closeAddSBHrepository())
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
            dispatch(closeAddSBHrepository())
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
                    <Group position="center">
                        <Button onClick={() => setStep(2)} disabled={!url}>
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
                        <Button disabled={!email || !password} onClick={() => handleSubmit(cleanUrl(url), email, password)}>
                            Submit
                        </Button>
                    </Group>
                </>
            )}
        </Modal>
    );
}

export default AddSBHRepository;