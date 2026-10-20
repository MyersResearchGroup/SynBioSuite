import { useEffect, useState } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Modal, Group } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import axios from 'axios';
import { showNotification, cleanNotifications } from '@mantine/notifications';
import { useDispatch, useSelector } from 'react-redux';
import { setFJPrimary } from '../../redux/slices/primaryRepositorySlice';

const login = async (instance, username, password) => {
    try {
        showNotification({
            title: 'Logging in',
            message: 'Please wait...',
            color: 'blue',
            loading: true,
        });
        const response = await axios.post(`${instance}/api/auth/log_in/`, {
            "username": username,
            "password": password
        }, {
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if(response.data){
            return {
                username: response.data.username,
                email: response.data.email,
                authtoken: response.data.access,
                refresh: response.data.refresh
            }
        }
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

const register = async (instance, payload) => {
    const registrationPayload = JSON.stringify({
        username: payload.username,
        password: payload.password,
        password2: payload.password,
        email: payload.email,
    });

    const response = await fetch(`${instance}/api/auth/register/`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: registrationPayload,
    });

    const responseText = await response.text();
    if (!response.ok) {
        throw new Error(responseText || 'Registration failed');
    }

    try {
        return JSON.parse(responseText) ?? { success: true };
    } catch {
        return responseText ? { success: true, message: responseText } : { success: true };
    }
};

const FJInstanceLogin = ({ opened, onClose, goBack, setRepoSelection, selectedRepo, selectedFJRepo, onLoginSuccess }) => {
    const [instanceData, setInstanceData] = useLocalStorage({ key: "Flapjack", defaultValue: [] });
    const [registerOpened, setRegisterOpened] = useState(false);
    const dispatch = useDispatch();
    const selected = useSelector(state => state.primaryRepository.fjPrimary);
    const setSelected = (value) => dispatch(setFJPrimary(typeof value === 'function' ? value(selected) : value));

    const repoToUse = selectedRepo || selectedFJRepo || selected;

    useEffect(() => {
        if (repoToUse && repoToUse !== selected) {
            setSelected(repoToUse);
        }
    }, [repoToUse, selected, setSelected]);

    const form = useForm({
        initialValues: {
            username: '',
            password: '',
        },

        validate: {
            username: (value) => (value ? null : 'Username is required'),
            password: (value) => (value ? null : 'Password is required')
        },
    });

    const registerForm = useForm({
        initialValues: {
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
        validate: {
            username: (value) => (value ? null : 'Username is required'),
            email: (value) => (value ? null : 'Email is required'),
            password: (value) => (value ? null : 'Password is required'),
            confirmPassword: (value, values) => (value === values.password ? null : 'Passwords do not match'),
        },
    });

    useEffect(() => {
        if (opened) {
            form.reset();
        }
    }, [opened]);

    const handleSubmit = async (values) => {
        if (!repoToUse) {
            showNotification({
                title: 'Login failed',
                message: 'No Flapjack repository selected. Please choose a repository before logging in.',
                color: 'red',
            });
            return;
        }

        if (form.isValid()){
            try {
                const existing = instanceData.find(item => item.registryURL === repoToUse) || {};
                const registryAPI = existing.registryAPI || repoToUse;
                const info = await login(registryAPI, values.username, values.password);
                const updatedInstance = { 
                    ...existing,
                    registryURL: repoToUse,
                    registryAPI: registryAPI,
                    registryPrefix: existing.registryPrefix || repoToUse,
                    username: values.username,
                    email: info.email,
                    authtoken: info.authtoken,
                    refresh: info.refresh 
                };

                const updatedInstanceData = instanceData.map((item) =>
                    item.registryURL === repoToUse ? updatedInstance : item
                );
                setInstanceData(updatedInstanceData);
                cleanNotifications();
                showNotification({
                    title: 'Login successful',
                    message: 'You have successfully logged in.',
                    color: 'green',
                });
                setSelected(updatedInstance.registryURL);
                if (typeof onLoginSuccess === 'function') {
                    onLoginSuccess();
                } else {
                    goBack(false);
                }
            } catch (error) {
                console.error('Login failed:', error);
                if(error.response?.status === 401){
                    cleanNotifications();
                    showNotification({
                        title: 'Login failed',
                        message: 'Please check your credentials and try again.',
                        color: 'red',
                    });
                } else {
                    cleanNotifications();
                    showNotification({
                        title: 'Login failed',
                        message: 'An error occurred. Please try again and make sure your repository is online.',
                        color: 'red',
                    });
                }
            }
            
        }
    };

    const handleRegisterSubmit = async (values) => {
        if (!repoToUse) {
            showNotification({
                title: 'Registration failed',
                message: 'Please select a Flapjack repository before registering.',
                color: 'red',
            });
            return;
        }

        try {
            const existing = instanceData.find(item => item.registryURL === repoToUse) || {};
            const registryAPI = existing.registryAPI || repoToUse;
            await register(registryAPI, {
                username: values.username,
                email: values.email,
                password: values.password,
            });

            cleanNotifications();
            showNotification({
                title: 'Registration successful',
                message: 'Your Flapjack account has been created. You can now log in.',
                color: 'green',
            });
            setRegisterOpened(false);
            registerForm.reset();
            form.setValues({ username: values.username, password: '' });
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
                onClose={onClose}
                title="Login to Flapjack"
            >
                <form
                    onSubmit={form.onSubmit((values) => {handleSubmit(values)})}
                >
                    <TextInput
                        label={"Username"}
                        placeholder={`Enter your username here`}
                        mt="md"
                        {...form.getInputProps('username')}
                    />
                    <PasswordInput
                        label="Password"
                        placeholder="Enter your password"
                        mt="md"
                        {...form.getInputProps('password')}
                    />
                    <Group position="apart" mt="xl">
                        <Button variant="default" onClick={() => {if(instanceData.length == 0) {setRepoSelection("")} else goBack(false)}}>
                            Back
                        </Button>
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
                title="Register to Flapjack"
            >
                <form onSubmit={registerForm.onSubmit((values) => { handleRegisterSubmit(values); })}>
                    <TextInput
                        label="Username"
                        placeholder="Choose a username"
                        mt="md"
                        {...registerForm.getInputProps('username')}
                    />
                    <TextInput
                        label="Email"
                        placeholder="Enter your email"
                        mt="md"
                        {...registerForm.getInputProps('email')}
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

export default FJInstanceLogin;