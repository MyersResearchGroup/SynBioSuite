import { useState, useEffect, useCallback } from 'react';
import { Stack, Select, Button, Group, Text, Alert } from '@mantine/core';
import { FaExclamationCircle } from 'react-icons/fa';
import { useLocalStorage } from '@mantine/hooks';
import { MODAL_TYPES } from './unifiedModal';

export default function RepositorySelectorModal({ 
    navigateTo, 
    goBack, 
    completeWorkflow,
    setModalData 
}) {
    const [dataSBH, setDataSBH] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [dataPrimarySBH, setDataPrimarySBH] = useLocalStorage({ key: "SynbioHub-Primary", defaultValue: "" });
    
    const [selectedRepo, setSelectedRepo] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (dataPrimarySBH && dataPrimarySBH.length > 0) {
            setSelectedRepo(dataPrimarySBH);
        } else if (dataSBH && dataSBH.length > 0) {
            setSelectedRepo(dataSBH[0].value);
        } else {
            setSelectedRepo('');
        }
    }, [dataPrimarySBH, dataSBH]);

    const handleRepoChange = useCallback((value) => {
        if (value === 'add-repository') {
            navigateTo(MODAL_TYPES.ADD_SBH_REPO);
        } else {
            setSelectedRepo(value);
            setDataPrimarySBH(value);
            setError(null);
        }
    }, [navigateTo, setDataPrimarySBH]);

    const handleNext = useCallback(() => {
        if (!selectedRepo || selectedRepo.startsWith('Select')) {
            setError('Please select a repository');
            return;
        }

        setModalData?.(prev => ({ ...prev, selectedRepo }));
        navigateTo(MODAL_TYPES.SBH_CREDENTIAL_CHECK, { selectedRepo });
    }, [selectedRepo, navigateTo, setModalData]);

    const handleRemoveInstance = useCallback(() => {
        if (!selectedRepo || selectedRepo === 'add-repository' || selectedRepo.startsWith('Select')) return;
        
        setDataSBH(repos => (repos || []).filter(r => r.value !== selectedRepo));
        setDataPrimarySBH(primary => (primary === selectedRepo ? '' : primary));
        setSelectedRepo('');
    }, [selectedRepo, setDataSBH, setDataPrimarySBH]);

    const repoOptions = [
        {
            value: 'Select a repository',
            label: 'Select a repository',
            disabled: true
        },
        ...(dataSBH || []).map((sbh) => ({
            value: sbh.value,
            label: sbh.label,
        })),
        {
            value: 'add-repository',
            label: (
                <span style={{ color: 'cyan', fontWeight: 500 }}>
                    + Add repository
                </span>
            ),
        },
    ];

    return (
        <Stack spacing="md">
            <Text size="lg" weight={500}>Select SynBioHub Repository</Text>
            
            {error && (
                <Alert icon={<FaExclamationCircle size={16} />} color="red" withCloseButton onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {dataSBH?.length === 0 && (
                <Alert icon={<FaExclamationCircle size={16} />} color="blue">
                    No repositories configured. Please add a repository to continue.
                </Alert>
            )}

            <Select
                data={repoOptions}
                placeholder="Select a repository"
                label="Repository"
                value={selectedRepo}
                onChange={handleRepoChange}
                withAsterisk
            />

            <Group position="apart" mt="md">
                <Button variant="default" onClick={() => goBack()}>
                    Cancel
                </Button>
                <Group>
                    {selectedRepo && selectedRepo !== 'add-repository' && !selectedRepo.startsWith('Select') && (
                        <Button color="red" variant="outline" onClick={handleRemoveInstance} mr="sm">
                            Remove Instance
                        </Button>
                    )}
                    <Button 
                        onClick={handleNext}
                        disabled={!selectedRepo || selectedRepo.startsWith('Select')}
                    >
                        Next: Verify Credentials
                    </Button>
                </Group>
            </Group>
        </Stack>
    );
}
