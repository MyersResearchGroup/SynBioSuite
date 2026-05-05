import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Modal, Group } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { showNotification, cleanNotifications } from '@mantine/notifications';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setSBHPrimary } from '../../redux/slices/primaryRepositorySlice';
import { SBHLogin, CheckLogin } from '../../API';

const SBHOnly = ({opened, onClose, goBack}) => {
    const [instanceData, setInstanceData] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const dispatch = useDispatch();
    const selected = useSelector(state => state.primaryRepository.sbhPrimary);
    const setSelected = (value) => dispatch(setSBHPrimary(typeof value === 'function' ? value(selected) : value));

    const getSelectedInstance = () => {
        return instanceData.find((item) => item.registryURL === selected);
    };

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

    // Reset form when modal is opened
    useEffect(() => {
        if (opened) {
            form.reset();
        }
    }, [opened]);

    const handleSubmit = async (values) => {
        if (form.isValid()){
            try {
                showNotification({
                    title: 'Logging in',
                    message: 'Please wait...',
                    color: 'blue',
                    loading: true,
                });
                
                const selectedInstance = getSelectedInstance();
                const registryAPI = selectedInstance?.registryAPI || selected;
                
                const authToken = await SBHLogin(registryAPI, values.email, values.password);
                const loginResult = await CheckLogin(registryAPI, authToken);
                
                if (!loginResult.valid) {
                    cleanNotifications();
                    showNotification({
                        title: 'Login failed',
                        message: 'Unable to verify login. Please try again.',
                        color: 'red',
                    });
                    return;
                }
                
                const info = loginResult.profile;
                
                const updatedInstance = { 
                    registryURL: selected, 
                    registryAPI,
                    registryPrefix: selectedInstance?.registryPrefix || selected,
                    email: info.email, 
                    authtoken: authToken,
                    name: info.name,
                    username: info.username,
                    affiliation: info.affiliation
                };

                const updatedInstanceData = instanceData.map((item) =>
                    item.registryURL === selected ? updatedInstance : item
                );
                
                setInstanceData(updatedInstanceData);
                setSelected(updatedInstance.registryURL);
                
                cleanNotifications();
                showNotification({
                    title: 'Login successful',
                    message: 'You have successfully logged in.',
                    color: 'green',
                });                
                onClose()
            } catch (error) {
                cleanNotifications();
                console.error('Login failed:', error);
                if(error.response?.status === 401){
                    showNotification({
                        title: 'Login failed',
                        message: 'Please check your credentials and try again.',
                        color: 'red',
                    });
                } else if(error.message){
                    showNotification({
                        title: 'Login failed',
                        message: error.message || 'An error occurred. Please try again and make sure your repository is online.',
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
            title="Login to SynbioHub"
        >
            <form
                onSubmit={form.onSubmit((values) => { handleSubmit(values) })}
            >
                <TextInput
                    label={"Email"}
                    placeholder={`Enter your email here`}
                    mt="md"
                    {...form.getInputProps('email')}
                />
                <PasswordInput
                    label="Password"
                    placeholder="Enter your password"
                    mt="md"
                    {...form.getInputProps('password')}
                />
                <Group position="apart" mt="xl">
                    {goBack && (
                        <Button variant="default" onClick={goBack}>
                            Back
                        </Button>
                    )}
                    <Button type="submit" ml={goBack ? undefined : "auto"}>
                        Login
                    </Button>
                </Group>
            </form>
        </Modal>
    );
};

export default SBHOnly;