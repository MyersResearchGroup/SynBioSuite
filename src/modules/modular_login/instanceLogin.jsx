import React, { useContext } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Box } from '@mantine/core';
import { InstanceContext } from '../../context/InstanceContext';
import Cookies from 'js-cookie'

const InstanceLogin = ({ onClose }) => {
    const { instanceData, setInstanceData } = useContext(InstanceContext);

    const form = useForm({
        initialValues: {
            instance: '',
            email: '',
            password: '',
        },

        validate: {
            instance: (value) => (value ? null : 'Instance is required'),
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
            password: (value) => (value.length >= 6 ? null : 'Password must be at least 6 characters'),
        },
    });

    const handleSubmit = (values) => {
        console.log('Form values:', values);
        const newInstance = { value: values.instance, label: values.instance };
        setInstanceData([...instanceData, newInstance]);
    };

    return (
        <Box sx={{ maxWidth: 300 }} mx="auto">
            <form
                onSubmit={form.onSubmit((values) => {
                    handleSubmit(values);
                    if (form.isValid()) {
                        onClose();
                    }
                })}
            >
                <TextInput
                    label="Instance"
                    placeholder="Enter instance"
                    {...form.getInputProps('instance')}
                />
                <TextInput
                    label="Email"
                    placeholder="Enter your email"
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
            </form>
        </Box>
    );
};

export default InstanceLogin;