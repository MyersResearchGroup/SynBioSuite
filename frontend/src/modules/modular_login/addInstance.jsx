import React from 'react';
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Box } from '@mantine/core';

const AddInstance = ({ goBack, repo }) => {
    const form = useForm({
        initialValues: {
            instance: '',
        }
    });

    // Helper to remove http://, https://, and www. in the input of the URL
    const cleanUrl = (inputUrl) => {
        return inputUrl.replace(/^(https?:\/\/)?(www\.)?/, '');
    };

    return (
        <Box sx={{ maxWidth: 300 }} mx="auto">
            <form
                onSubmit={form.onSubmit((values) => {
                    goBack(cleanUrl(values.instance));
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