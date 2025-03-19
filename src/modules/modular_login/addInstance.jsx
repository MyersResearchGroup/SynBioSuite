import React from 'react';
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Box } from '@mantine/core';

const AddInstance = ({ goBack, repo }) => {
    const form = useForm({
        initialValues: {
            instance: '',
        },

        validate: {
            instance: (value) => (value && !/[/]/.test(value) ? null : `${repo} instance is required and must not contain forward slashes`),
        },
    });

    const handleSubmit = async (values) => {
        if (form.isValid()){
            goBack(values);
        }
    };

    return (
        <Box sx={{ maxWidth: 300 }} mx="auto">
            <form
                onSubmit={form.onSubmit((values) => {
                    // Strip https:// and www. from the beginning of the value
                    goBack(values.instance.replace(/^(https?:\/\/)?(www\.)?/, ''));
                })}
            >
                <TextInput
                    label={`Enter ${repo} URL`}
                    placeholder="Enter URL"
                    {...form.getInputProps('instance')}
                />
                <Button type="submit" mt="md">
                    Add
                </Button>
                <Button variant="outline" mt="md" ml="sm" onClick={() => goBack("placeholder")}>
                    Back
                </Button>
            </form>
        </Box>
    );
};

export default AddInstance;