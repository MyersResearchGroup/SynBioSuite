import React from 'react';
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Box } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import axios from 'axios';
import { showNotification, cleanNotifications } from '@mantine/notifications';

const login = async (instance, username, password) => {
    try {
        showNotification({
            title: 'Logging in',
            message: 'Please wait...',
            color: 'blue',
            loading: true,
        });
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
                authtoken: response.data.access,
                refresh: response.data.refresh
            }
        }
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

const FJInstanceLogin = ({ goBack, setRepoSelection }) => {
    const [instanceData, setInstanceData] = useLocalStorage({ key: "Flapjack", defaultValue: [] });
    const [selected, setSelected] = useLocalStorage({ key: `Flapjack-Primary`, defaultValue: [] });

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

    const handleSubmit = async (values) => {
        if (form.isValid()){
            try {
                const info = await login(selected, values.username, values.password);
                const updatedInstance = { 
                    value: selected, 
                    label: selected,
                    instance: selected, 
                    username: values.username, 
                    email: info.email,
                    authtoken: info.authtoken,
                    refresh: info.refresh 
                };

                const updatedInstanceData = instanceData.map((item) =>
                    item.instance === selected ? updatedInstance : item
                );
                setInstanceData(updatedInstanceData);
                cleanNotifications();
                showNotification({
                    title: 'Login successful',
                    message: 'You have successfully logged in.',
                    color: 'green',
                });
                setSelected(updatedInstance.value);
                goBack(false)
            } catch (error) {
                console.error('Login failed:', error);
                if(error.status === 401){
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
        <Box sx={{ maxWidth: 300 }} mx="auto">
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
        </Box>
    );
};

export default FJInstanceLogin;