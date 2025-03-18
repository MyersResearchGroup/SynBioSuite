import React, { useContext } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Box } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import axios from 'axios';
import { showNotification, cleanNotifications } from '@mantine/notifications';

const login = async (instance, email, password) => {
    try {
        showNotification({
            title: 'Logging in',
            message: 'Please wait...',
            color: 'blue',
            loading: true,
        });
        const response = await axios.post(`https://${instance}/login`, {
            "email": email,
            "password": password
        }, {
            headers: {
                'accept': 'text/plain',
                'Content-Type': 'application/json',
            }
        });
        if(response.data){
            let data = await getProfile(instance, response.data);
            data.auth = response.data;
            return data;
        }
    } catch (error) {
        cleanNotifications();
        console.error('Error:', error);
        throw error;
    }
};

const getProfile = async (instance, auth) => {
    try {
        const response = await axios.get(`https://${instance}/profile`, {
            headers: {
                'Accept': 'text/plain; charset=UTF-8',
                "X-authorization" : `${auth}`
            }
        });
        if(response.data){
            cleanNotifications();
            return response.data;
        }
    } catch (error) {
        cleanNotifications();
        console.error('Error:', error);
        throw error;
    }
};

const SBHInstanceLogin = ({ onClose, goBack, setRepoSelection }) => {
    const [instanceData, setInstanceData] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [instance, setSelectedInstanceValue] = useLocalStorage({ key: "SynbioHub-Primary", defaultValue: [] });

    const form = useForm({
        initialValues: {
            email: '',
            password: '',
        },

        validate: {
            email: (value) => (null),
            password: (value) => (value ? null : 'Password is required')
        },
    });

    const handleSubmit = async (values) => {
        if (form.isValid()){
            try {
                const info = await login(values.instance, values.email, values.password);
                const updatedInstance = { 
                    value: values.instance, 
                    label: values.instance,
                    instance: values.instance, 
                    email: info.email, 
                    authtoken: info.auth,
                    name: info.name,
                    username: info.username,
                    affiliation: info.affiliation
                };

                const updatedInstanceData = instanceData.map((item) =>
                    item.instance === values.instance ? updatedInstance : item
                );
                setInstanceData(updatedInstanceData);
                showNotification({
                    title: 'Login successful',
                    message: 'You have successfully logged in.',
                    color: 'green',
                });
                setSelectedInstanceValue(updatedInstance.value);
                goBack(false)
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
                onSubmit={form.onSubmit((values) => {handleSubmit({ ...values, instance })})}
            >
                <TextInput
                    label={"Email or Username"}
                    placeholder={`Enter your email or username here`}
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
                <Button variant="outline" mt="md" ml="sm" onClick={() => {if(instanceData.length == 0) {setRepoSelection("")} else goBack(false)}}>
                    Back
                </Button>
            </form>
        </Box>
    );
};

export default SBHInstanceLogin;