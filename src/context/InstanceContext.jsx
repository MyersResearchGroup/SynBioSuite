import React, { createContext, useState } from 'react';

export const InstanceContext = createContext();

export const InstanceProvider = ({ children }) => {
    const initialData = [
        { value: 'instance1', label: 'Instance 1' },
        { value: 'instance2', label: 'Instance 2' },
        { value: 'instance3', label: 'Instance 3' }
    ];

    const [instanceData, setInstanceData] = useState(initialData);

    const [repoName, setRepoName] = useState('');

    return (
        <InstanceContext.Provider value={{ instanceData, setInstanceData, repoName, setRepoName }}>
            {children}
        </InstanceContext.Provider>
    );
};