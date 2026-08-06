import { useState, useEffect } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Box, Modal } from '@mantine/core';
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

const FJInstanceLogin = ({ opened, onClose, goBack, setRepoSelection, selectedRepo, selectedFJRepo, onLoginSuccess }) => {
    const [instanceData, setInstanceData] = useLocalStorage({ key: "Flapjack", defaultValue: [] });
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

    // Reset form when modal is opened
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

    return (
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
                <Button type="submit" mt="md">
                    Login
                </Button>
                <Button variant="outline" mt="md" ml="sm" onClick={() => {if(instanceData.length == 0) {setRepoSelection("")} else goBack(false)}}>
                    Back
                </Button>
            </form>
        </Modal>
    );
};

export default FJInstanceLogin;