import React, { useContext } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Box } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import axios from 'axios';
import { showNotification } from '@mantine/notifications';

const login = async (instance, username, password) => {
    try {
        const response = await axios.post(`https://${instance}/api/auth/log_in/`, {
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
                access: response.data.access,
                refresh: response.data.refresh
            }
        }
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

const InstanceLogin = ({ onClose, goBack, setRepoSelection }) => {
    const [instanceData, setInstanceData] = useLocalStorage({ key: "Flapjack", defaultValue: [] });
    const [selectedInstanceValue, setSelectedInstanceValue] = useLocalStorage({ key: `Flapjack-Primary`, defaultValue: [] });

    const form = useForm({
        initialValues: {
            instance: '',
            username: '',
            password: '',
        },

        validate: {
            instance: (value) => (value && !/[/]/.test(value) ? null : `Flapjack instance is required and must not contain forward slashes`),
            username: (value) => (value ? null : 'Username is required'),
            password: (value) => (value ? null : 'Password is required')
        },
    });

    const handleSubmit = async (values) => {
        if (form.isValid()){
            try {
                const info = await login(values.instance, values.username, values.password);
                const newInstance = { 
                    value: `${values.username},  ${values.instance}`, 
                    label: `${values.username},  ${values.instance}`,
                    instance: values.instance, 
                    username: values.username, 
                    email: info.email,
                    access: info.access,
                    refresh: info.refresh 
                };
                const existingIndex = instanceData.findIndex((instance) => instance.value === newInstance.value);
                if (existingIndex !== -1) {
                    const updatedInstanceData = [...instanceData];
                    updatedInstanceData[existingIndex] = newInstance;
                    setInstanceData(updatedInstanceData);
                    showNotification({
                        title: 'Login exists',
                        message: 'This repository has already been added.',
                        color: 'yellow',
                    });
                } else {
                    setInstanceData([...instanceData, newInstance]);
                    showNotification({
                        title: 'Login successful',
                        message: 'You have successfully logged in.',
                        color: 'green',
                    });
                }
                setSelectedInstanceValue(newInstance.value);
                setRepoSelection("");
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
                    // Strip https:// and www. from the beginning of the value
                    const instance = values.instance.replace(/^(https?:\/\/)?(www\.)?/, '');
                    handleSubmit({ ...values, instance });
                })}
            >
                <TextInput
                    label={`Flapjack URL`}
                    placeholder="Enter URL"
                    {...form.getInputProps('instance')}
                />
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
        </Box>
    );
};

export default InstanceLogin;