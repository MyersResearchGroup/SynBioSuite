import { useState, useContext } from 'react';
import { Select, Button } from '@mantine/core';
import InstanceLogin from './instanceLogin';
import { InstanceContext } from '../../context/InstanceContext';
import Cookies from 'js-cookie'

const InstanceSelector = ({onClose }) => {
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

    return (
        <>
            {showLogin ? (
                <InstanceLogin onClose={onClose} />
            ) : (
                <>
                    <Select
                        label="Select an instance"
                        placeholder="Pick one"
                        data={instanceData}
                        onChange={(value) => setSelectedInstanceValue(value)}
                        value={selectedInstanceValue}
                    />
                    <div style={{ marginTop: '20px', display: 'flex' }}>
                        <Button mr="md" onClick={() => {setShowLogin(true); console.log(showLogin)}}>Add Instance</Button>
                        <Button onClick={() => {handleRemoveInstance(); onClose();}}>Remove Instance</Button>
                        <Button ml="auto" onClick={onClose}>Confirm Instance</Button>
                    </div>
                </>
            )}
        </>
    );
};

export default InstanceSelector;