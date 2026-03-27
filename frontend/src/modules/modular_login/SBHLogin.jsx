import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Box } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import axios from 'axios';
import { showNotification, cleanNotifications } from '@mantine/notifications';
import { useDispatch, useSelector } from 'react-redux';
import { setSBHPrimary } from '../../redux/slices/primaryRepositorySlice';

const login = async (instance, email, password) => {
    try {
        showNotification({
            title: 'Logging in',
            message: 'Please wait...',
            color: 'blue',
            loading: true,
        });

        const response = await axios.post(`${instance}/login`, {
            email,
            password,
        }, {
            headers: {
                accept: 'text/plain',
                'Content-Type': 'application/json',
            },
        });

        if (response.data) {
            const profile = await getProfile(instance, response.data);
            return { ...profile, authtoken: response.data };
        }
    } catch (error) {
        cleanNotifications();
        throw error;
    }
};

const getProfile = async (instance, auth) => {
    try {
        const response = await axios.get(`${instance}/profile`, {
            headers: {
                Accept: 'text/plain; charset=UTF-8',
                'X-authorization': `${auth}`,
            },
        });

        if (response.data) {
            cleanNotifications();
            return response.data;
        }
    } catch (error) {
        cleanNotifications();
        throw error;
    }
};

const SBHInstanceLogin = ({ goBack, setRepoSelection }) => {
    const [instanceData, setInstanceData] = useLocalStorage({ key: 'SynbioHub', defaultValue: [] });
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
            const info = await login(selected, values.email, values.password);
            const existing = instanceData.find(item => item.registryURL === selected) || {};
            const updatedInstance = {
                ...existing,
                registryURL: selected,
                registryAPI: existing.registryAPI || selected,
                registryPrefix: existing.registryPrefix || selected,
                email: info.email,
                authtoken: info.authtoken,
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
