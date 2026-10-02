import { useState } from 'react';
import { Select, Button } from '@mantine/core';
import SBHInstanceLogin from './SBHLogin';
import AddRegistryModal from '../unified_modal/AddRegistryModal';
import { useLocalStorage } from '@mantine/hooks';
import { cleanNotifications, showNotification } from '@mantine/notifications';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { setSBHPrimary } from '../../redux/slices/primaryRepositorySlice';
import { CheckLogin, clearInvalidCredentials } from '../../API';
import { MODAL_TYPES } from '../unified_modal/unifiedModal';

const SBHInstanceSelector = ({
    onClose,
    setRepoSelection,
    navigateTo,
    completeWorkflow,
    modalData = {},
    setModalData,
}) => {
    const [showLogin, setShowLogin] = useState(false);
    const [addRegistryOpen, setAddRegistryOpen] = useState(false);
    const [instanceData, setInstanceData] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [nullSelected, setNullSelected] = useState(false);
    const dispatch = useDispatch();
    const selected = useSelector(state => state.primaryRepository.sbhPrimary);
    const selectedRepo = modalData.selectedRepo || selected;
    const setSelected = (value) => {
        const nextValue = typeof value === 'function' ? value(selected) : value;
        dispatch(setSBHPrimary(nextValue));
        setModalData?.(prev => ({ ...prev, selectedRepo: nextValue }));
    };

    const unifiedNextModal = modalData.nextModal || MODAL_TYPES.FLAPJACK_OPTIONS;
    const isUnifiedFlow = typeof navigateTo === 'function' || typeof completeWorkflow === 'function';

    const findInstance = (uri) => instanceData.find((element) => element.registryURL === uri);

    const handleRemoveInstance = () => {
        setInstanceData(instanceData.filter(instance => instance.registryURL !== selectedRepo));
        setSelected(null);
    };

    const stripData = (uri, showNotificationFlag = false) => {
        const updatedInstanceData = instanceData.map((item) =>
            item.registryURL === uri ? {
                ...item,
                email: '',
                authtoken: '',
                name: '',
                username: '',
                affiliation: '',
            } : item
        );

        setInstanceData(updatedInstanceData);

        if (!showNotificationFlag) {
            showNotification({
                title: 'Logout Successful',
                message: 'You have successfully logged out of the repository',
                color: 'green',
            });
        }
    };

    const login = async (uri, auth) => {
        const instance = findInstance(uri);
        const registryAPI = instance?.registryAPI || uri;
        try {
            const response = await axios.get(`${registryAPI}/profile`, {
                headers: {
                    'Accept': 'text/plain; charset=UTF-8',
                    'X-authorization': `${auth}`
                }
            });
            if (response.data) {
                setRepoSelection?.('');
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
            await axios.post(`${registryAPI}/logout`, null, {
                headers: {
                    'Accept': 'text/plain; charset=UTF-8',
                    'X-authorization': `${auth}`
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
            registryURL,
            registryAPI,
            registryPrefix,
            email: '',
            authtoken: '',
            name: '',
            username: '',
            affiliation: ''
        };

        setInstanceData([...instanceData, newInstance]);
        setSelected(registryURL);
    };

    const handleUnifiedSelection = async () => {
        if (!selectedRepo || selectedRepo.startsWith('Select')) {
            setNullSelected(true);
            return;
        }

        setSelected(selectedRepo);
        setModalData?.(prev => ({ ...prev, selectedRepo: selectedRepo, skipRepositorySelection: true }));

        const repoInfo = (instanceData || []).find(r => r.registryURL === selectedRepo);
        if (!repoInfo || !repoInfo.authtoken) {
            if (typeof navigateTo === 'function') {
                navigateTo(MODAL_TYPES.SBH_LOGIN, {
                    selectedRepo: selectedRepo,
                    returnTo: unifiedNextModal,
                });
                return;
            }
            if (typeof onClose === 'function') {
                onClose({ selectedRepo: selectedRepo });
            }
            return;
        }

        try {
            const loginResult = await CheckLogin(repoInfo.registryAPI || selectedRepo, repoInfo.authtoken);
            if (!loginResult.valid) {
                clearInvalidCredentials(selectedRepo);
                showNotification({
                    title: 'Invalid Credentials',
                    message: 'Stored credentials are invalid or expired. Please log in.',
                    color: 'orange',
                });
                if (typeof navigateTo === 'function') {
                    navigateTo(MODAL_TYPES.SBH_LOGIN, {
                        selectedRepo: selectedRepo,
                        returnTo: unifiedNextModal,
                    });
                    return;
                }
                if (typeof onClose === 'function') {
                    onClose({ selectedRepo: selectedRepo });
                }
                return;
            }

            const profileEmail = loginResult.profile?.email || '';
            const userInfo = {
                name: loginResult.profile?.name || repoInfo.name || 'Unknown',
                username: loginResult.profile?.username || repoInfo.username || 'Unknown',
                email: profileEmail,
                affiliation: loginResult.profile?.affiliation || repoInfo.affiliation || 'N/A',
            };

            setModalData?.(prev => ({
                ...prev,
                selectedRepo: selectedRepo,
                userInfo,
                authToken: repoInfo.authtoken,
                validated: true,
            }));

            if (typeof navigateTo === 'function') {
                const moved = navigateTo(unifiedNextModal, {
                    selectedRepo: selectedRepo,
                    authToken: repoInfo.authtoken,
                    validated: true,
                    userInfo,
                });
                if (!moved && typeof completeWorkflow === 'function') {
                    completeWorkflow({ selectedRepo: selectedRepo, authToken: repoInfo.authtoken, validated: true, userInfo });
                }
                return;
            }

            if (typeof completeWorkflow === 'function') {
                completeWorkflow({ selectedRepo: selectedRepo, authToken: repoInfo.authtoken, validated: true, userInfo });
            }
        } catch (err) {
            console.error('Credential check error:', err);
            clearInvalidCredentials(selectedRepo);
            showNotification({
                title: 'Credential Check Failed',
                message: err.message || 'Failed to verify credentials. Please log in.',
                color: 'red',
            });
            if (typeof navigateTo === 'function') {
                navigateTo(MODAL_TYPES.SBH_LOGIN, {
                    selectedRepo: selectedRepo,
                    returnTo: unifiedNextModal,
                });
                return;
            }
            if (typeof onClose === 'function') {
                onClose({ selectedRepo: selectedRepo });
            }
        }
    };

    const selectData = instanceData.map(inst => ({
        value: inst.registryURL,
        label: inst.registryURL,
    }));

    return (
        <>
            {showLogin ? (
                <SBHInstanceLogin
                    opened={true}
                    onClose={() => setShowLogin(false)}
                    goBack={setShowLogin}
                    setRepoSelection={setRepoSelection}
                    selectedRepo={selectedRepo}
                    onLoginSuccess={() => {
                        setShowLogin(false);
                        setRepoSelection?.('');
                    }}
                />
            ) : (
                <>
                    <AddRegistryModal
                        opened={addRegistryOpen}
                        onClose={() => setAddRegistryOpen(false)}
                        onAdd={handleAddRegistry}
                        title="SynbioHub Repository"
                        existingRegistries={instanceData.map(inst => inst.registryURL)}
                    />
                    <Select
                        label="Select a SynbioHub repository"
                        placeholder="Pick one"
                        data={selectData}
                        onChange={(value) => {
                            setNullSelected(false);
                            setSelected(value);
                        }}
                        value={selectedRepo || null}
                    />
                    {nullSelected && <div style={{ color: 'red', marginTop: '1px', fontSize: '12px' }}>No selected repository. Please select a repository</div>}
                    <div style={{ marginTop: '20px', display: 'flex' }}>
                        <Button mr="md" onClick={() => setAddRegistryOpen(true)}>Add</Button>
                        {selectedRepo && (
                            <>
                                <Button mr="md" onClick={() => {
                                    if (selectedRepo != null) {
                                        handleRemoveInstance();
                                        setRepoSelection?.('');
                                    } else {
                                        setNullSelected(true);
                                    }
                                }}>
                                    Remove
                                </Button>
                                {findInstance(selectedRepo)?.authtoken ? (
                                    <>
                                        <Button mr="md" onClick={() => { logout(selectedRepo, findInstance(selectedRepo)?.authtoken); }}>
                                            Log Out
                                        </Button>
                                        <Button ml="auto" onClick={isUnifiedFlow ? handleUnifiedSelection : () => onClose?.()}>
                                            Select
                                        </Button>
                                    </>
                                ) : (
                                    <Button mr="md" onClick={() => { setShowLogin(true); }}>
                                        Login
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}
        </>
    );
};

export default SBHInstanceSelector;