import { useState } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Modal, Group } from '@mantine/core';
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

const register = async (instance, payload) => {
    const body = new URLSearchParams();
    body.append('username', payload.username || payload.email || '');
    body.append('name', payload.name || payload.username || payload.email || '');
    body.append('affiliation', payload.affiliation || '');
    body.append('email', payload.email || '');
    body.append('password1', payload.password || '');
    body.append('password2', payload.password || '');

    const response = await axios.post(`${instance}/register`, body.toString(), {
        headers: {
            Accept: 'text/plain; charset=UTF-8',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
    });

    return response.data ?? { success: true };
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

const SBHInstanceLogin = ({ opened = true, onClose, goBack, setRepoSelection }) => {
    const [instanceData, setInstanceData] = useLocalStorage({ key: 'SynbioHub', defaultValue: [] });
    const [registerOpened, setRegisterOpened] = useState(false);
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

    const registerForm = useForm({
        initialValues: {
            email: '',
            username: '',
            name: '',
            affiliation: '',
            password: '',
            confirmPassword: '',
        },
        validate: {
            email: (value) => (value ? null : 'Email is required'),
            username: (value) => (value ? null : 'Username is required'),
            password: (value) => (value ? null : 'Password is required'),
            confirmPassword: (value, values) => (value === values.password ? null : 'Passwords do not match'),
        },
    });

    const handleSubmit = async (values) => {
        if (!form.isValid()) {
            return;
        }

        try {
            const existing = instanceData.find(item => item.registryURL === selected) || {};
            const registryAPI = existing.registryAPI || selected;
            const info = await login(registryAPI, values.email, values.password);
            const updatedInstance = {
                ...existing,
                registryURL: selected,
                registryAPI,
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

    const handleRegisterSubmit = async (values) => {
        if (!selected) {
            showNotification({
                title: 'Registration failed',
                message: 'Please select a SynBioHub instance before registering.',
                color: 'red',
            });
            return;
        }

        try {
            const existing = instanceData.find(item => item.registryURL === selected) || {};
            const registryAPI = existing.registryAPI || selected;

            await register(registryAPI, {
                email: values.email,
                username: values.username,
                name: values.name,
                affiliation: values.affiliation,
                password: values.password,
            });

            cleanNotifications();
            showNotification({
                title: 'Registration successful',
                message: 'Your SynBioHub account has been created. You can now log in.',
                color: 'green',
            });
            setRegisterOpened(false);
            registerForm.reset();
            form.setValues({ email: values.email, password: '' });
        } catch (error) {
            cleanNotifications();
            const backendMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unable to register your account.';
            showNotification({
                title: 'Registration failed',
                message: typeof backendMessage === 'string' ? backendMessage : 'Unable to register your account.',
                color: 'red',
            });
        }
    };

    return (
        <>
            <Modal
                opened={opened}
                onClose={onClose || (() => {
                    if (instanceData.length === 0) {
                        setRepoSelection?.('');
                    } else {
                        goBack?.(false);
                    }
                })}
                title="Login to SynBioHub"
            >
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
                    <Group position="apart" mt="xl">
                        {goBack && (
                            <Button variant="default" onClick={() => {
                                if (instanceData.length === 0) {
                                    setRepoSelection?.('');
                                } else {
                                    goBack(false);
                                }
                            }}>
                                Back
                            </Button>
                        )}
                        <Group spacing="sm">
                            <Button variant="default" onClick={() => setRegisterOpened(true)}>
                                Register
                            </Button>
                            <Button type="submit">
                                Login
                            </Button>
                        </Group>
                    </Group>
                </form>
            </Modal>

            <Modal
                opened={registerOpened}
                onClose={() => setRegisterOpened(false)}
                title="Register to SynBioHub"
            >
                <form onSubmit={registerForm.onSubmit((values) => { handleRegisterSubmit(values); })}>
                    <TextInput
                        label="Email"
                        placeholder="Enter your email"
                        mt="md"
                        {...registerForm.getInputProps('email')}
                    />
                    <TextInput
                        label="Username"
                        placeholder="Choose a username"
                        mt="md"
                        {...registerForm.getInputProps('username')}
                    />
                    <TextInput
                        label="Display name"
                        placeholder="Optional display name"
                        mt="md"
                        {...registerForm.getInputProps('name')}
                    />
                    <TextInput
                        label="Affiliation"
                        placeholder="Optional affiliation"
                        mt="md"
                        {...registerForm.getInputProps('affiliation')}
                    />
                    <PasswordInput
                        label="Password"
                        placeholder="Create a password"
                        mt="md"
                        {...registerForm.getInputProps('password')}
                    />
                    <PasswordInput
                        label="Confirm password"
                        placeholder="Repeat your password"
                        mt="md"
                        {...registerForm.getInputProps('confirmPassword')}
                    />
                    <Group position="right" mt="xl">
                        <Button variant="default" onClick={() => setRegisterOpened(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Create account
                        </Button>
                    </Group>
                </form>
            </Modal>
        </>
    );
};

export default SBHInstanceLogin;
