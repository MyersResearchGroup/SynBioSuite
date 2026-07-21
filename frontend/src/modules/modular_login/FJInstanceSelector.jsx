import { useState } from 'react';
import { Select, Button } from '@mantine/core';
import FJInstanceLogin from './FJLogin';
import AddRegistryModal from '../unified_modal/AddRegistryModal';
import { useRepositoryStorage } from '../auth/useRepositoryStorage';
import { showNotification } from '@mantine/notifications';
import { useDispatch, useSelector } from 'react-redux';
import { setFJPrimary } from '../../redux/slices/primaryRepositorySlice';
import { flapjackAdapter } from '../auth/providers/index.js';
import {
    clearCredentials,
    getCredentialsForRepository,
    setCredentials,
} from '../auth/credentialStore.js';

const FJInstanceSelector = ({onClose, setRepoSelection }) => {
    const [showLogin, setShowLogin] = useState(false);
    const [addRegistryOpen, setAddRegistryOpen] = useState(false);
    const [instanceData, setInstanceData] = useRepositoryStorage('flapjack');
    const [nullSelected, setNullSelected] = useState(false);
    const dispatch = useDispatch();
    const selected = useSelector(state => state.primaryRepository.fjPrimary);
    const setSelected = (value) => dispatch(setFJPrimary(typeof value === 'function' ? value(selected) : value));
    
    const findInstance = (uri) => {
        return instanceData.find((element) => element.registryURL === uri);
    }

    const handleRemoveInstance = () => {
        clearCredentials('flapjack', selected);
        setInstanceData(instanceData.filter(instance => instance.registryURL !== selected));
        setSelected(null);
    };

    const stripData = (uri, showNotificationFlag = false) => {
        const updatedInstance = {
            email:"",
            registryURL: uri,
            registryAPI: uri,
            registryPrefix: uri,
            username:"",
        };
        const updatedInstanceData = instanceData.map((item) =>
            item.registryURL === uri ? updatedInstance : item
        );
        setInstanceData(updatedInstanceData);
        clearCredentials('flapjack', uri);

        if (!showNotificationFlag) {
            showNotification({
                title: 'Logout Successful',
                message: 'You have successfully logged out of the repository',
                color: 'green',
            });
        }
    }

    const login = async (uri) => {
        const instance = findInstance(uri);
        const registryAPI = instance?.registryAPI || uri;
        try {
            const credentials = getCredentialsForRepository('flapjack', uri);
            const result = await flapjackAdapter.refresh({
                instance: registryAPI,
                refreshToken: credentials?.refreshToken,
            });
            setCredentials('flapjack', uri, result.credentials);

            showNotification({
                title: 'Login Successful',
                message: 'You have successfully logged into Flapjack',
                color: 'green',
            });
            
            setRepoSelection("")
        } catch (error) {
            stripData(uri, true);
            showNotification({
                title: 'Login Failed',
                message: 'Unable to log into the Flapjack. Please try again.',
                color: 'red',
            });
        }
    };

    const handleAddRegistry = ({ registryURL, registryAPI, registryPrefix }) => {
        if (instanceData.some(instance => instance.registryURL === registryURL)) {
            showNotification({
                title: 'Login exists',
                message: 'This repository has already been added. Please add a different repository.',
                color: 'yellow',
            });
            return;
        }

        const newInstance = {
            email: "",
            registryURL,
            registryAPI,
            registryPrefix,
            username: "",
        };

        setInstanceData([...instanceData, newInstance]);
        setSelected(registryURL);
    };

    const selectData = instanceData.map(inst => ({
        value: inst.registryURL,
        label: inst.registryURL,
    }));

    return (
        <>
            {showLogin ? (
                <FJInstanceLogin onClose={onClose} goBack={setShowLogin} setRepoSelection={setRepoSelection}/>
            ) : (
                <>
                    <AddRegistryModal
                        opened={addRegistryOpen}
                        onClose={() => setAddRegistryOpen(false)}
                        onAdd={handleAddRegistry}
                        title="Flapjack Repository"
                        existingRegistries={instanceData.map(inst => inst.registryURL)}
                    />
                    <Select
                        label={`Select a Flapjack repository`}
                        placeholder="Pick one"
                        data={selectData}
                        onChange={(value) => {setNullSelected(false); setSelected(value)}}
                        value={selected}
                    />
                    {nullSelected && <div style={{ color: 'red', marginTop: '1px', fontSize: '12px' }}>No selected repository. Please select an repository</div>}
                    <div style={{ marginTop: '20px', display: 'flex' }}>
                        <Button mr="md" onClick={() => setAddRegistryOpen(true)}>Add</Button>
                        {selected && (
                            <>
                                <Button mr="md" onClick={() => 
                                    {if (selected != null)
                                        {handleRemoveInstance(); setRepoSelection("")}
                                        else setNullSelected(true)}}>
                                    Remove
                                </Button>
                                {getCredentialsForRepository('flapjack', selected)?.accessToken ?
                                    (<>
                                        <Button mr="md" onClick={() => {stripData(selected)}}>Log Out</Button>
                                        <Button ml="auto" onClick={() => {setRepoSelection("")}}>Select</Button>
                                    </>)
                                :
                                    <Button mr="md" onClick={() => {setShowLogin(true)}}>Login</Button>}
                            </>
                        )}
                    </div>
                </>
            )}
        </>
    );
};

export default FJInstanceSelector;
