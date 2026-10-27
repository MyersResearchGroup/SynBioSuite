import { useEffect } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Modal } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { showNotification, cleanNotifications } from '@mantine/notifications';
import { useDispatch, useSelector } from 'react-redux';
import { setBOBPrimary } from '../../redux/slices/primaryRepositorySlice';
import { loginBOB } from '../../API';

const BOBInstanceLogin = ({ opened, onClose, goBack, setRepoSelection, selectedRepo, selectedBOBRepo, onLoginSuccess }) => {
    const [instanceData, setInstanceData] = useLocalStorage({ key: "BOB", defaultValue: [] });
    const dispatch = useDispatch();
    const selected = useSelector(state => state.primaryRepository.bobPrimary);
    const setSelected = (value) => dispatch(setBOBPrimary(typeof value === 'function' ? value(selected) : value));

    const repoToUse = selectedRepo || selectedBOBRepo || selected;

    useEffect(() => {
        if (repoToUse && repoToUse !== selected) {
            setSelected(repoToUse);
        }
    }, [repoToUse, selected, setSelected]);

    const form = useForm({
        initialValues: { email: '', password: '' },
        validate: {
            email: (value) => (value ? null : 'Email is required'),
            password: (value) => (value ? null : 'Password is required'),
        },
    });

    useEffect(() => {
        if (opened) {
            form.reset();
        }
    }, [opened]);

    const handleSubmit = async (values) => {
        if (!repoToUse) {
            showNotification({ title: 'Login failed', message: 'No BOB server selected. Please choose one before logging in.', color: 'red' });
            return;
        }
        const existing = instanceData.find(item => item.registryURL === repoToUse) || {};
        const registryAPI = existing.registryAPI || repoToUse;
        showNotification({ title: 'Logging in', message: 'Please wait...', color: 'blue', loading: true });
        try {
            const info = await loginBOB(registryAPI, values.email, values.password);
            const updatedInstance = {
                ...existing,
                registryURL: repoToUse,
                registryAPI: registryAPI,
                registryPrefix: existing.registryPrefix || repoToUse,
                username: info.username,
                email: info.email,
                authtoken: info.authtoken,
                tokenId: info.tokenId,
            };
            setInstanceData(instanceData.map((item) => item.registryURL === repoToUse ? updatedInstance : item));
            cleanNotifications();
            showNotification({ title: 'Login successful', message: 'You have successfully logged in to BOB.', color: 'green' });
            setSelected(updatedInstance.registryURL);
            if (typeof onLoginSuccess === 'function') {
                onLoginSuccess();
            } else {
                goBack(false);
            }
        } catch (error) {
            cleanNotifications();
            const status = error.response?.status;
            showNotification({
                title: 'Login failed',
                message: status === 401 ? 'Please check your email and password and try again.'
                    : status === 429 ? (error.response?.data?.detail || 'Too many attempts. Please wait and try again.')
                    : 'An error occurred. Make sure the BOB server is online and allows this site (BOB_CORS_ORIGINS).',
                color: 'red',
            });
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Login to BOB">
            <form onSubmit={form.onSubmit((values) => { handleSubmit(values) })}>
                <TextInput label="Email" placeholder="Enter your BOB email" mt="md" {...form.getInputProps('email')} />
                <PasswordInput label="Password" placeholder="Enter your password" mt="md" {...form.getInputProps('password')} />
                <Button type="submit" mt="md">Login</Button>
                <Button variant="outline" mt="md" ml="sm" onClick={() => { if (instanceData.length == 0) { setRepoSelection?.("") } else goBack(false) }}>
                    Back
                </Button>
            </form>
        </Modal>
    );
};

export default BOBInstanceLogin;
