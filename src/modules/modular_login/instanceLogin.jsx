import React, { useContext } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Box } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import axios from 'axios';
import { showNotification } from '@mantine/notifications';

const login = async (instance, emailOrUsername, password, repoName) => {
    if(repoName === 'SynbioHub') {
        try {
            const response = await axios.post(`https://${instance}/login`, {
                "email": emailOrUsername,
                "password": password
            }, {
                headers: {
                    'accept': 'text/plain',
                    'Content-Type': 'application/json',
                }
            });
            if(response.data){
                console.log(`Values for login: instance=${instance}, email=${emailOrUsername}, password=${password}`);
                console.log('Response data:', response.data);
                return response.data;
            }
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }
    console.log("Repo name:", repoName);
    if (repoName === "Flapjack") {
        try {
            const response = await axios.post(`https://${instance}/api/auth/log_in/`, {
                "username": emailOrUsername,
                "password": password
            }, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            if(response.data){
                console.log(`Values for login: instance=${instance}, username=${emailOrUsername}, password=${password}`);
                console.log('Response data:', response.data);
                return {
                    username: response.data.username,
                    access: response.data.access,
                    refresh: response.data.refresh
                }
            }
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }
};

const InstanceLogin = ({ onClose, repoName, goBack }) => {
    const [instanceData, setInstanceData] = useLocalStorage({ key: repoName, defaultValue: [] });
    const [selectedInstanceValue, setSelectedInstanceValue] = useLocalStorage({ key: `${repoName}-Primary`, defaultValue: [] });

    const form = useForm({
        initialValues: {
            instance: '',
            email: '',
            username: '',
            password: '',
        },

        validate: {
            instance: (value) => (value && !/[/]/.test(value) ? null : `${repoName} instance is required and must not contain forward slashes`),
            email: (value) => (repoName !== "Flapjack" ? (value && /^\S+@\S+$/.test(value) ? null : 'Invalid email') : null),
            username: (value) => (repoName === "Flapjack" ? (value ? null : 'Username is required') : null),
            password: (value) => (value ? null : 'Password is required')
        },
    });

    const handleSubmit = async (values) => {
        if (form.isValid()){
            console.log(`Submitting login for instance=${values.instance}, email=${values.email}`);
            try {
                const info = await login(values.instance, repoName === "SynbioHub" ? values.email : values.username, values.password, repoName);
                const newInstance = { 
                    value: `${repoName == "SynbioHub" ? values.email : values.username},  ${values.instance}`, 
                    label: `${repoName == "SynbioHub" ? values.email : values.username},  ${values.instance}`,
                    instance: values.instance, 
                    email: values.email, 
                    ...(repoName === "SynbioHub" ? { authToken: info } : { access: info.access, refresh: info.refresh }) 
                };
                /*const existingIndex = instanceData.findIndex(
                    (instance) => instance.value === newInstance.value
                );
                if (existingIndex !== -1) {
                    instanceData[existingIndex] = newInstance;
                } else {
                    instanceData.push(newInstance);
                }*/
                setInstanceData([...instanceData, newInstance]);
                setSelectedInstanceValue(newInstance.value);
                showNotification({
                    title: 'Login successful',
                    message: 'You have successfully logged in.',
                    color: 'green',
                });
                onClose();
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
            }
            
        }
    };

    return (
        <Box sx={{ maxWidth: 300 }} mx="auto">
            <form
                onSubmit={form.onSubmit((values) => {
                    handleSubmit(values);
                })}
            >
                <TextInput
                    label={`${repoName} instance`}
                    placeholder="Enter instance"
                    {...form.getInputProps('instance')}
                />
                <TextInput
                    label={repoName != "Flapjack" ? "Email" : "Username"}
                    placeholder={`Enter your ${repoName != "Flapjack" ? "Email" : "Username"}`}
                    mt="md"
                    {...form.getInputProps(repoName != "Flapjack" ? 'email' : 'username')}
                />
                <PasswordInput
                    label="Password"
                    placeholder="Enter your password"
                    mt="md"
                    {...form.getInputProps('password')}
                />
                <Button type="submit" onClick={() => console.log("testing")} mt="md">
                    Login
                </Button>
                <Button variant="outline" mt="md" ml="sm" onClick={() => goBack(false)}>
                    Back
                </Button>
            </form>
        </Box>
    );
};

export default InstanceLogin;