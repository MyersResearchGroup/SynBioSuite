import { useState, useEffect } from 'react';
import { Select, Button } from '@mantine/core';
import SBHInstanceLogin from './SBHLogin';
import AddInstance from './addInstance';
import { useLocalStorage } from '@mantine/hooks';
import { cleanNotifications, showNotification } from '@mantine/notifications';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { setSBHPrimary } from '../../redux/slices/primaryRepositorySlice';

const SBHInstanceSelector = ({onClose, setRepoSelection }) => {
    const [showLogin, setShowLogin] = useState(false);
    const [addingInstance, setAddingInstance] = useState("placeholder");
    const [instanceData, setInstanceData] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [nullSelected, setNullSelected] = useState(false);
    const dispatch = useDispatch();
    const selected = useSelector(state => state.primaryRepository.sbhPrimary);
    const setSelected = (value) => dispatch(setSBHPrimary(typeof value === 'function' ? value(selected) : value));
    
    const findInstance = (uri) => {
        return instanceData.find((element) => element.registryURL === uri);
    }

    const handleRemoveInstance = () => {
        setInstanceData(instanceData.filter(instance => instance.registryURL !== selected));
        setSelected(null);
    };

    const stripData = (uri, showNotificationFlag = false) => {
        const updatedInstance = {
            registryURL: uri,
            registryAPI: uri,
            registryPrefix: uri,
            email: '',
            authtoken: '',
            name: '',
            username: '',
            affiliation: ''
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

    const login = async (uri, auth) => {
        const instance = findInstance(uri);
        const registryAPI = instance?.registryAPI || uri;
        try {
            const response = await axios.get(`${registryAPI}/profile`, {
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
            stripData(uri, true);
            showNotification({
                title: 'Login Failed',
                message: 'Unable to login. Try logging in again.',
                color: 'red',
            });
            console.error('Error:', error);
            throw error;
        }
    };

    const logout = async (uri, auth) => {
        const instance = findInstance(uri);
        const registryAPI = instance?.registryAPI || uri;
        try {
            cleanNotifications();
            showNotification({
                title: 'Logging out',
                message: 'Logging out of SynbioHub',
                color: 'blue',
                loading: true,
            });
            const response = await axios.post(`${registryAPI}/logout`, null, {
                headers: {
                    'Accept': 'text/plain; charset=UTF-8',
                    "X-authorization" : `${auth}`
                }
            });
            cleanNotifications();
            stripData(uri);

        } catch (error) {
            cleanNotifications();
            stripData(uri, true);
            showNotification({
                title: 'Logout Failed',
                message: 'Unable to logout from SynbioHub correctly. Credentials on SynbioSuite have been reset. If this is happening consistently please reach out to the SynbioSuite team.',
                color: 'red',
            });
            console.error('Error:', error);
            throw error;
        }
    };

    const normalizeUrl = (inputUrl) => {
        let url = inputUrl.trim();
        if (!/^https?:\/\//i.test(url)) {
            url = url.replace(/^www\./i, '');
            url = `https://${url}`;
        }
        return url;
    };

    useEffect(() => {
        if (addingInstance != null && addingInstance != "placeholder") {
            const uri = normalizeUrl(addingInstance);
            const newInstance = { 
                registryURL: uri,
                registryAPI: uri,
                registryPrefix: uri,
                email: '', 
                authtoken: '',
                name: '',
                username: '',
                affiliation: ''
            };
            if (!instanceData.some(instance => instance.registryURL === newInstance.registryURL)) {
                setInstanceData([...instanceData, newInstance]);
                setSelected(uri);
            } else {
                showNotification({
                    title: 'Login exists',
                    message: 'This repository has already been added. Please add a different repository.',
                    color: 'yellow',
                })
            }
        }
    }, [addingInstance]);

    const selectData = instanceData.map(inst => ({
        value: inst.registryURL,
        label: inst.registryURL,
    }));

    return (
        <>
            {!addingInstance ? 
                <AddInstance goBack={setAddingInstance} repo={"SynbioHub"}/>
            :
                showLogin ?
                    <SBHInstanceLogin onClose={onClose} goBack={setShowLogin} setRepoSelection={setRepoSelection}/>
            : ( <>
                    <Select
                        label={`Select a SynbioHub repository`}
                        placeholder="Pick one"
                        data={selectData}
                        onChange={(value) => {setNullSelected(false); setSelected(value)}}
                        value={selected}
                    />
                    {nullSelected && <div style={{ color: 'red', marginTop: '1px', fontSize: '12px' }}>No selected repository. Please select an repository</div>}
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