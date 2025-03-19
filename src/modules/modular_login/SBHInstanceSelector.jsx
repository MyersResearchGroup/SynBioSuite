import { useState, useEffect } from 'react';
import { Select, Button } from '@mantine/core';
import SBHInstanceLogin from './SBHLogin';
import AddInstance from './addInstance';
import { useLocalStorage } from '@mantine/hooks';
import { cleanNotifications, showNotification } from '@mantine/notifications';
import axios from 'axios';

const SBHInstanceSelector = ({onClose, setRepoSelection }) => {
    const [showLogin, setShowLogin] = useState(false);
    const [addingInstance, setAddingInstance] = useState("placeholder");
    const [instanceData, setInstanceData] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [nullSelected, setNullSelected] = useState(false);
    const [selected, setSelected] = useLocalStorage({ key: `SynbioHub-Primary`, defaultValue: [] });
    
    const findInstance = (instance) => {
        return instanceData.find((element) => element.value === instance);
    }

    const handleRemoveInstance = () => {
        setInstanceData(instanceData.filter(instance => instance.value !== selected));
        setSelected(null);
    };

    const stripData = (selected, showNotificationFlag = false) => {
        const updatedInstance = {
            value: selected,
            label: selected,
            instance: selected,
            email: '',
            authtoken: '',
            name: '',
            username: '',
            affiliation: ''
        };
        const updatedInstanceData = instanceData.map((item) =>
            item.instance === selected ? updatedInstance : item
        );
        setInstanceData(updatedInstanceData);
        
        if (!showNotificationFlag) {
            showNotification({
                title: 'Logout Successful',
                message: 'You have successfully logged out of the registry',
                color: 'green',
            });
        }
    }

    const login = async (instance, auth) => {
        try {
            const response = await axios.get(`https://${instance}/profile`, {
                headers: {
                    'Accept': 'text/plain; charset=UTF-8',
                    "X-authorization" : `${auth}`
                }
            });
            if(response.data){
                setRepoSelection("");
                return;
            }
        } catch (error) {
            stripData(instance, true);
            showNotification({
                title: 'Login Failed',
                message: 'Unable to login. Try logging in again.',
                color: 'red',
            });
            console.error('Error:', error);
            throw error;
        }
    };

    const logout = async (instance, auth) => {
        try {
            cleanNotifications();
            showNotification({
                title: 'Logging out',
                message: 'Logging out of SynbioHub',
                color: 'blue',
                loading: true,
            });
            const response = await axios.post(`https://${instance}/logout`, null, {
                headers: {
                    'Accept': 'text/plain; charset=UTF-8',
                    "X-authorization" : `${auth}`
                }
            });
            cleanNotifications();
            stripData(instance);

        } catch (error) {
            cleanNotifications();
            stripData(instance, true);
            showNotification({
                title: 'Logout Failed',
                message: 'Unable to logout from SynbioHub correctly. Credentials on SynbioSuite have been reset. If this is happening consistently please reach out to the SynbioSuite team.',
                color: 'red',
            });
            console.error('Error:', error);
            throw error;
        }
    };

    useEffect(() => {
        if (addingInstance != null && addingInstance != "placeholder") {
            const newInstance = { 
                value: addingInstance, 
                label: addingInstance,
                instance: addingInstance, 
                email: '', 
                authtoken: '',
                name: '',
                username: '',
                affiliation: ''

            };
            if (!instanceData.some(instance => instance.value === newInstance.value)) {
                setInstanceData([...instanceData, newInstance]);
                setSelected(addingInstance);
            } else {
                showNotification({
                    title: 'Login exists',
                    message: 'This repository has already been added. Please add a different repository.',
                    color: 'yellow',
                })
            }
        }
    }, [addingInstance]);

    return (
        <>
            {!addingInstance ? 
                <AddInstance goBack={setAddingInstance} repo={"SynbioHub"}/>
            :
                showLogin ?
                    <SBHInstanceLogin onClose={onClose} goBack={setShowLogin} setRepoSelection={setRepoSelection}/>
            : ( <>
                    <Select
                        label={`Select a SynbioHub registry`}
                        placeholder="Pick one"
                        data={instanceData}
                        onChange={(value) => {setNullSelected(false); setSelected(value)}}
                        value={selected}
                    />
                    {nullSelected && <div style={{ color: 'red', marginTop: '1px', fontSize: '12px' }}>No selected registry. Please select an registry</div>}
                    <div style={{ marginTop: '20px', display: 'flex' }}>
                        <Button mr="md" onClick={() => {setAddingInstance(null)}}>Add</Button>
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
                                    <Button mr="md" onClick={() => {logout(selected, findInstance(selected)?.authtoken)}}>Log Out</Button>
                                    <Button ml="auto" onClick={() => {login(selected, findInstance(selected)?.authtoken)}}>Select</Button>
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

export default SBHInstanceSelector;