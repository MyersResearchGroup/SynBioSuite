import { useState, useContext } from 'react';
import { Select, Button } from '@mantine/core';
import InstanceLogin from './instanceLogin';
import { InstanceContext } from '../../context/InstanceContext';
import Cookies from 'js-cookie'

const InstanceSelector = ({onClose, repoName }) => {
    const [showLogin, setShowLogin] = useState(false);
    const { instanceData, setInstanceData } = useContext(InstanceContext);
    
    const [selectedInstanceValue, setSelectedInstanceValue] = useState(null);
    const handleRemoveInstance = () => {
        // Assuming instanceData is an array of instances
        const selectedInstance = instanceData.find(instance => instance.value === selectedInstanceValue);
        const updatedInstanceData = instanceData.filter(instance => instance !== selectedInstance);
        setInstanceData(updatedInstanceData);
        setSelectedInstanceValue(null); // Reset the select component
    };

    const [nullInstanceSelected, setNullInstanceSelected] = useState(false);

    return (
        <>
            {showLogin ? (
                <InstanceLogin onClose={onClose} repoName={repoName} goBack={setShowLogin}/>
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
                        <Button mr="md" onClick={() => {setShowLogin(true)}}>Add Instance</Button>
                        <Button onClick={() => 
                        {if (selectedInstanceValue != null)
                            {handleRemoveInstance(); onClose()}
                            else setNullInstanceSelected(true)}}>
                        Remove Instance</Button>
                        <Button ml="auto" onClick={onClose}>Confirm Instance</Button>
                    </div>
                </>
            )}
        </>
    );
};

export default InstanceSelector;