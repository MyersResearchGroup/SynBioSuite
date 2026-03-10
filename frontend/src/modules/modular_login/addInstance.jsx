import React from 'react';
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Box } from '@mantine/core';

const AddInstance = ({ goBack, repo }) => {
    const form = useForm({
        initialValues: {
            instance: '',
        }
    });

    // Helper to normalize URL: ensure it has http:// or https:// prefix
    const normalizeUrl = (inputUrl) => {
        let url = inputUrl.trim();
        if (!/^https?:\/\//i.test(url)) {
            url = url.replace(/^www\./i, '');
            url = `https://${url}`;
        }
        return url;
    };

    return (
        <Box sx={{ maxWidth: 300 }} mx="auto">
            <form
                onSubmit={form.onSubmit((values) => {
                    goBack(normalizeUrl(values.instance));
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