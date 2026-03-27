import { useState } from 'react';
import { Select, Button } from '@mantine/core';
import FJInstanceLogin from './FJLogin';
import AddRegistryModal from '../unified_modal/AddRegistryModal';
import { useLocalStorage } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { useDispatch, useSelector } from 'react-redux';
import { setFJPrimary } from '../../redux/slices/primaryRepositorySlice';

const FJInstanceSelector = ({onClose, setRepoSelection }) => {
    const [showLogin, setShowLogin] = useState(false);
    const [addRegistryOpen, setAddRegistryOpen] = useState(false);
    const [instanceData, setInstanceData] = useLocalStorage({ key: "Flapjack", defaultValue: [] });
    const [nullSelected, setNullSelected] = useState(false);
    const dispatch = useDispatch();
    const selected = useSelector(state => state.primaryRepository.fjPrimary);
    const setSelected = (value) => dispatch(setFJPrimary(typeof value === 'function' ? value(selected) : value));
    
    const findInstance = (uri) => {
        return instanceData.find((element) => element.registryURL === uri);
    }

    const handleRemoveInstance = () => {
        setInstanceData(instanceData.filter(instance => instance.registryURL !== selected));
        setSelected(null);
    };

    const stripData = (uri, showNotificationFlag = false) => {
        const updatedInstance = {
            authtoken:"",
            email:"",
            registryURL: uri,
            registryAPI: uri,
            registryPrefix: uri,
            refresh:"",
            username:"",
        };
        const updatedInstanceData = instanceData.map((item) =>
            item.registryURL === uri ? updatedInstance : item
        );
        setInstanceData(updatedInstanceData);

        if (!showNotificationFlag) {
            showNotification({
                title: 'Logout Successful',
                message: 'You have successfully logged out of the repository',
                color: 'green',
            });
        }
    }

    //Does not work as intended
    //Throws CORS error
    const login = async (uri, refresh) => {
        const instance = findInstance(uri);
        const registryAPI = instance?.registryAPI || uri;
        try {
            const response = await fetch(`${registryAPI}/api/auth/refresh/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh }),
            });

            if (!response.ok) {
                throw new Error('Failed to refresh token');
            }

            const data = await response.json();
            const updatedInstance = {
                ...findInstance(uri),
                authtoken: data.access,
                refresh: data.refresh,
            };

            const updatedInstanceData = instanceData.map((item) =>
                item.registryURL === uri ? updatedInstance : item
            );

            setInstanceData(updatedInstanceData);

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
            authtoken: "",
            email: "",
            registryURL,
            registryAPI,
            registryPrefix,
            refresh: "",
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
                                {findInstance(selected)?.authtoken ?
                                    (<>
                                        <Button mr="md" onClick={() => {stripData(selected)}}>Log Out</Button>
                                        <Button ml="auto" onClick={() => {/*login(selected, findInstance(selected)?.refresh)*/; setRepoSelection("")}}>Select</Button>
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