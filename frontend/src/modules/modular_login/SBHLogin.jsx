import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Box } from '@mantine/core';
import { useRepositoryStorage } from '../auth/useRepositoryStorage';
import { showNotification, cleanNotifications } from '@mantine/notifications';
import { useDispatch, useSelector } from 'react-redux';
import { setSBHPrimary } from '../../redux/slices/primaryRepositorySlice';
import { synBioHubAdapter } from '../auth/providers/index.js';
import { setCredentials } from '../auth/credentialStore.js';

const login = async (instance, email, password) => {
    try {
        showNotification({
            title: 'Logging in',
            message: 'Please wait...',
            color: 'blue',
            loading: true,
        });

        const result = await synBioHubAdapter.login({
            instance,
            email,
            password,
        });
        return result;
    } catch (error) {
        cleanNotifications();
        throw error;
    }
};

const SBHInstanceLogin = ({ goBack, setRepoSelection }) => {
    const [instanceData, setInstanceData] = useRepositoryStorage('synbiohub');
    const dispatch = useDispatch();
    const selected = useSelector(state => state.primaryRepository.sbhPrimary);
    const setSelected = (value) => dispatch(setSBHPrimary(typeof value === 'function' ? value(selected) : value));

    const form = useForm({
        initialValues: {
            email: '',
            password: '',
        },
        validate: {
            email: () => null,
            password: (value) => (value ? null : 'Password is required'),
        },
    });

    const handleSubmit = async (values) => {
        if (!form.isValid()) {
            return;
        }

        try {
            const existing = instanceData.find(item => item.registryURL === selected) || {};
            const registryAPI = existing.registryAPI || selected;
            const result = await login(registryAPI, values.email, values.password);
            const info = result.profile || {};
            setCredentials('synbiohub', selected, result.credentials);
            const updatedInstance = {
                ...existing,
                registryURL: selected,
                registryAPI,
                registryPrefix: existing.registryPrefix || selected,
                email: info.email,
                name: info.name,
                username: info.username,
                affiliation: info.affiliation,
            };

            const updatedInstanceData = instanceData.map((item) =>
                item.registryURL === selected ? updatedInstance : item
            );

            setInstanceData(updatedInstanceData);
            cleanNotifications();
            showNotification({
                title: 'Login successful',
                message: 'You have successfully logged in.',
                color: 'green',
            });
            setSelected(updatedInstance.registryURL);
            goBack(false);
        } catch (error) {
            cleanNotifications();
            if (error.status === 401) {
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
        }
    };

    return (
        <Box sx={{ maxWidth: 300 }} mx="auto">
            <form onSubmit={form.onSubmit((values) => { handleSubmit(values); })}>
                <TextInput
                    label="Email"
                    placeholder="Enter your email here"
                    mt="md"
                    {...form.getInputProps('email')}
                />
                <PasswordInput
                    label="Password"
                    placeholder="Enter your password"
                    mt="md"
                    {...form.getInputProps('password')}
                />
                <Button type="submit" mt="md">
                    Login
                </Button>
                <Button
                    variant="outline"
                    mt="md"
                    ml="sm"
                    onClick={() => {
                        if (instanceData.length === 0) {
                            setRepoSelection('');
                        } else {
                            goBack(false);
                        }
                    }}
                >
                    Back
                </Button>
            </form>
        </Box>
    );
};

export default SBHInstanceLogin;
