import { useState, useContext } from 'react';
import { Select, Button } from '@mantine/core';
import InstanceLogin from './instanceLogin';
import { useLocalStorage } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';

const InstanceSelector = ({onClose, repoName, setRepoSelection }) => {
    const [showLogin, setShowLogin] = useState(false);
    const [instanceData, setInstanceData] = useLocalStorage({ key: repoName, defaultValue: [] });
    const [nullInstanceSelected, setNullInstanceSelected] = useState(false);
    const [selectedInstanceValue, setSelectedInstanceValue] = useLocalStorage({ key: `${repoName}-Primary`, defaultValue: [] });
    
    const handleRemoveInstance = () => {
        setInstanceData(instanceData.filter(instance => `${repoName == "SynbioHub" ? instance.email : instance.username},  ${instance.instance}` !== selectedInstanceValue));
        setSelectedInstanceValue(null);
    };

    return (
        <>
            {showLogin ? (
                <InstanceLogin onClose={onClose} repoName={repoName} goBack={setShowLogin} setRepoSelection={setRepoSelection}/>
            ) : (
                <>
                    <Select
                        label={`Select an instance of ${repoName}`}
                        placeholder="Pick one"
                        data={instanceData}
                        onChange={(value) => {setNullInstanceSelected(false); setSelectedInstanceValue(value)}}
                        value={selectedInstanceValue}
                    />
                    {nullInstanceSelected && <div style={{ color: 'red', marginTop: '1px', fontSize: '12px' }}>No selected instance. Please select an instance</div>}
                    <div style={{ marginTop: '20px', display: 'flex' }}>
                        <Button mr="md" onClick={() => {setShowLogin(true)}}>Add Repository</Button>
                        <Button onClick={() => 
                        {if (selectedInstanceValue != null)
                            {handleRemoveInstance(); setRepoSelection("")}
                            else setNullInstanceSelected(true)}}>
                        Remove Repository</Button>
                        <Button ml="auto" onClick={() => 
                        {if (selectedInstanceValue != null)
                            setRepoSelection("")
                            else showNotification({
                                title: 'Warning',
                                message: 'No repository selected. Please select a repository.',
                                color: 'yellow',
                            })}}>Confirm Repository Selection</Button>
                    </div>
                </>
            )}
        </>
    );
};

export default InstanceSelector;