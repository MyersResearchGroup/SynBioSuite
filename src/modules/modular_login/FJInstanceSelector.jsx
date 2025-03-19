import { useState, useEffect } from 'react';
import { Select, Button } from '@mantine/core';
import FJInstanceLogin from './FJLogin';
import AddInstance from './addInstance';
import { useLocalStorage } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';

const FJInstanceSelector = ({onClose, setRepoSelection }) => {
    const [showLogin, setShowLogin] = useState(false);
    const [addingInstance, setAddingInstance] = useState("placeholder");
    const [instanceData, setInstanceData] = useLocalStorage({ key: "Flapjack", defaultValue: [] });
    const [nullSelected, setNullSelected] = useState(false);
    const [selected, setSelected] = useLocalStorage({ key: `Flapjack-Primary`, defaultValue: [] });
    
    const findInstance = (instance) => {
        return instanceData.find((element) => element.value === instance);
    }

    const handleRemoveInstance = () => {
        setInstanceData(instanceData.filter(instance => instance.value !== selected));
        setSelected(null);
    };

    const stripData = (selected, showNotificationFlag = false) => {
        const updatedInstance = {
            authtoken:"",
            email:"",
            instance:selected,
            label:selected, 
            refresh:"",
            username:"",
            value:selected
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

    //Does not work as intended
    //Throws CORS error
    const login = async (instance, refresh) => {
        try {
            const response = await fetch(`http://${instance}/api/auth/refresh/`, {
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
                ...findInstance(instance),
                authtoken: data.access,
                refresh: data.refresh,
            };

            const updatedInstanceData = instanceData.map((item) =>
                item.instance === instance ? updatedInstance : item
            );

            setInstanceData(updatedInstanceData);

            showNotification({
                title: 'Login Successful',
                message: 'You have successfully logged into Flapjack',
                color: 'green',
            });
            
            setRepoSelection("")
        } catch (error) {
            stripData(instance, true);
            showNotification({
                title: 'Login Failed',
                message: 'Unable to log into the Flapjack. Please try again.',
                color: 'red',
            });
        }
    };

    useEffect(() => {
            if (addingInstance != null && addingInstance != "placeholder") {
                const newInstance = { 
                    authtoken:"",
                    email:"",
                    instance:addingInstance,
                    label:addingInstance, 
                    refresh:"",
                    username:"",
                    value:addingInstance
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
        {! addingInstance ? 
            <AddInstance goBack={setAddingInstance} repo="Flapjack" />
        :
            showLogin ? (
                <FJInstanceLogin onClose={onClose} goBack={setShowLogin} setRepoSelection={setRepoSelection}/>
            ) : (
                <>
                    <Select
                        label={`Select a Flapjack registry`}
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