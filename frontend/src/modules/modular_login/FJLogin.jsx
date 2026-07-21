import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Box } from '@mantine/core';
import { useRepositoryStorage } from '../auth/useRepositoryStorage';
import { showNotification, cleanNotifications } from '@mantine/notifications';
import { useDispatch, useSelector } from 'react-redux';
import { setFJPrimary } from '../../redux/slices/primaryRepositorySlice';
import { flapjackAdapter } from '../auth/providers/index.js';
import { setCredentials } from '../auth/credentialStore.js';

const login = async (instance, username, password) => {
    try {
        showNotification({
            title: 'Logging in',
            message: 'Please wait...',
            color: 'blue',
            loading: true,
        });
        const result = await flapjackAdapter.login({
            instance,
            username,
            password,
        });
        return result;
    } catch (error) {
        throw error;
    }
};

const FJInstanceLogin = ({ goBack, setRepoSelection, onSuccess }) => {
    const [instanceData, setInstanceData] = useRepositoryStorage('flapjack');
    const dispatch = useDispatch();
    const selected = useSelector(state => state.primaryRepository.fjPrimary);
    const setSelected = (value) => dispatch(setFJPrimary(typeof value === 'function' ? value(selected) : value));

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
                const existing = instanceData.find(item => item.registryURL === selected) || {};
                const registryAPI = existing.registryAPI || selected;
                const result = await login(registryAPI, values.username, values.password);
                const info = result.profile || {};
                setCredentials('flapjack', selected, result.credentials);
                const updatedInstance = { 
                    ...existing,
                    registryURL: selected, 
                    registryAPI,
                    registryPrefix: existing.registryPrefix || selected,
                    username: values.username, 
                    email: info.email,
                };

                const updatedInstanceData = instanceData.map((item) =>
                    item.registryURL === selected ? updatedInstance : item
                );
                setInstanceData(updatedInstanceData);
                cleanNotifications();
                showNotification({
                    title: 'Login successful',
                    message: 'You have successfully logged in.',
                    color: 'green',
                });
                setSelected(updatedInstance.registryURL);
                if (onSuccess) onSuccess(updatedInstance);
                else goBack(false)
            } catch (error) {
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
