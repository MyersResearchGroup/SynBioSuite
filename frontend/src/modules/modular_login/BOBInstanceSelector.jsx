import { useState } from 'react';
import { Select, Button } from '@mantine/core';
import BOBInstanceLogin from './BOBLogin';
import AddRegistryModal from '../unified_modal/AddRegistryModal';
import { useLocalStorage } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { useDispatch, useSelector } from 'react-redux';
import { setBOBPrimary } from '../../redux/slices/primaryRepositorySlice';
import { logoutBOB } from '../../API';

const BOBInstanceSelector = ({ onClose, setRepoSelection }) => {
    const [showLogin, setShowLogin] = useState(false);
    const [addRegistryOpen, setAddRegistryOpen] = useState(false);
    const [instanceData, setInstanceData] = useLocalStorage({ key: "BOB", defaultValue: [] });
    const [nullSelected, setNullSelected] = useState(false);
    const dispatch = useDispatch();
    const selected = useSelector(state => state.primaryRepository.bobPrimary);
    const setSelected = (value) => dispatch(setBOBPrimary(typeof value === 'function' ? value(selected) : value));

    const findInstance = (uri) => instanceData.find((element) => element.registryURL === uri);

    const handleRemoveInstance = () => {
        setInstanceData(instanceData.filter(instance => instance.registryURL !== selected));
        setSelected(null);
    };

    // BOB's tokens do not expire, so logging out revokes the token on the server too.
    const logOut = async (uri) => {
        const instance = findInstance(uri);
        if (instance?.authtoken) {
            await logoutBOB(instance.registryAPI || uri, instance.authtoken, instance.tokenId);
        }
        setInstanceData(instanceData.map((item) =>
            item.registryURL === uri ? { ...item, email: '', authtoken: '', tokenId: '', username: '' } : item
        ));
        showNotification({ title: 'Logout Successful', message: 'You have logged out of BOB', color: 'green' });
    };

    const handleAddRegistry = ({ registryURL, registryAPI, registryPrefix }) => {
        if (instanceData.some(instance => instance.registryURL === registryURL)) {
            showNotification({ title: 'Login exists', message: 'This BOB server has already been added.', color: 'yellow' });
            return;
        }
        setInstanceData([...instanceData, { authtoken: "", tokenId: "", email: "", registryURL, registryAPI, registryPrefix, username: "" }]);
        setSelected(registryURL);
    };

    const selectData = instanceData.map(inst => ({ value: inst.registryURL, label: inst.registryURL }));

    return (
        <>
            {showLogin ? (
                <BOBInstanceLogin
                    opened={true}
                    onClose={onClose}
                    goBack={setShowLogin}
                    setRepoSelection={setRepoSelection}
                    selectedRepo={selected}
                    selectedBOBRepo={selected}
                    onLoginSuccess={() => {
                        setShowLogin(false);
                        setRepoSelection?.("");
                    }}
                />
            ) : (
                <>
                    <AddRegistryModal
                        opened={addRegistryOpen}
                        onClose={() => setAddRegistryOpen(false)}
                        onAdd={handleAddRegistry}
                        title="BOB Server"
                        existingRegistries={instanceData.map(inst => inst.registryURL)}
                        urlPlaceholder="bob.example.org"
                        apiPlaceholder="bob.example.org"
                    />
                    <Select
                        label="Select a BOB server"
                        placeholder="Pick one"
                        data={selectData}
                        onChange={(value) => { setNullSelected(false); setSelected(value) }}
                        value={selected}
                    />
                    {nullSelected && <div style={{ color: 'red', marginTop: '1px', fontSize: '12px' }}>No server selected. Please select a BOB server</div>}
                    <div style={{ marginTop: '20px', display: 'flex' }}>
                        <Button mr="md" onClick={() => setAddRegistryOpen(true)}>Add</Button>
                        {selected && (
                            <>
                                <Button mr="md" onClick={() => {
                                    if (selected != null) { handleRemoveInstance(); setRepoSelection("") }
                                    else setNullSelected(true)
                                }}>
                                    Remove
                                </Button>
                                {findInstance(selected)?.authtoken ?
                                    (<>
                                        <Button mr="md" onClick={() => { logOut(selected) }}>Log Out</Button>
                                        <Button ml="auto" onClick={() => onClose?.()}>Select</Button>
                                    </>)
                                    :
                                    <Button mr="md" onClick={() => { setShowLogin(true) }}>Login</Button>}
                            </>
                        )}
                    </div>
                </>
            )}
        </>
    );
};

export default BOBInstanceSelector;
