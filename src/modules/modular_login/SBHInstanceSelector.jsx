import { useState, useEffect } from 'react';
import { Select, Button } from '@mantine/core';
import SBHInstanceLogin from './SBHLogin';
import { useLocalStorage } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';

const SBHInstanceSelector = ({onClose, setRepoSelection }) => {
    const [showLogin, setShowLogin] = useState(false);
    const [instanceData, setInstanceData] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [nullInstanceSelected, setNullInstanceSelected] = useState(false);
    const [selectedInstanceValue, setSelectedInstanceValue] = useLocalStorage({ key: `SynbioHub-Primary`, defaultValue: [] });
    
    const handleRemoveInstance = () => {
        setInstanceData(instanceData.filter(instance => `${instance.email},  ${instance.instance}` !== selectedInstanceValue));
        setSelectedInstanceValue(null);
    };

    return (
        <>
            {showLogin ? (
                <SBHInstanceLogin onClose={onClose} goBack={setShowLogin} setRepoSelection={setRepoSelection}/>
            ) : (
                <>
                    <Select
                        label={`Select a SynbioHub registry`}
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

export default SBHInstanceSelector;