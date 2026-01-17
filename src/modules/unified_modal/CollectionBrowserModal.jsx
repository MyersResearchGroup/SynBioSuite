import { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Stack, 
    Table, 
    ScrollArea, 
    Button, 
    Group, 
    Text, 
    Breadcrumbs, 
    Anchor,
    Badge,
    Loader,
    Center,
    Checkbox,
    Radio,
    Paper,
    Divider,
    ActionIcon
} from '@mantine/core';
import { searchCollections, CheckLogin, clearInvalidCredentials } from '../../API';
import { useLocalStorage } from '@mantine/hooks';
import { FaTimes } from 'react-icons/fa';
import { showNotification } from '@mantine/notifications';
import { MODAL_TYPES } from './unifiedModal';


export default function CollectionBrowserModal({ 
    navigateTo, 
    goBack, 
    completeWorkflow,
    onCancel,
    modalData = {},
    setModalData,

    selectedRepo: selectedRepoFromProps,
    expectedEmail: expectedEmailFromProps,
    silentCredentialCheck: silentCredentialCheckFromProps,
    skipRepositorySelection: skipRepositorySelectionFromProps,
    multiSelect: multiSelectFromProps,
}) {
    const [dataSBH] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [dataPrimarySBH] = useLocalStorage({ key: "SynbioHub-Primary", defaultValue: "" });

    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [credentialChecking, setCredentialChecking] = useState(false);
    const [selectedCollections, setSelectedCollections] = useState(new Map());
    const [breadcrumbs, setBreadcrumbs] = useState([{ name: 'Root', uri: null }]);
    const [currentPath, setCurrentPath] = useState([]);

    const isMountedRef = useRef(true);
    const abortControllerRef = useRef(null);
    const credentialCheckDoneRef = useRef(false);

    const selectedRepo = selectedRepoFromProps || modalData.selectedRepo || dataPrimarySBH;
    const expectedEmail = expectedEmailFromProps || modalData.expectedEmail;
    const silentCredentialCheck = silentCredentialCheckFromProps ?? modalData.silentCredentialCheck;
    const multiSelect = multiSelectFromProps ?? modalData.multiSelect ?? true;

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    useEffect(() => {
        if (!silentCredentialCheck || credentialCheckDoneRef.current || dataSBH.length === 0) {
            return;
        }

        const checkCredentials = async () => {
            setCredentialChecking(true);
            credentialCheckDoneRef.current = true;

            const repoInfo = dataSBH.find(r => r.value === selectedRepo);
            
            if (!repoInfo) {
                showNotification({
                    title: 'Repository Not Found',
                    message: 'Could not find repository information.',
                    color: 'red',
                });
                completeWorkflow({ error: 'Repository not found', aborted: true });
                return;
            }

            const authToken = repoInfo.authtoken;

            if (!authToken) {
                setModalData?.(prev => ({
                    ...prev,
                    selectedRepo,
                    expectedEmail,
                    skipRepositorySelection: true,
                }));
                navigateTo(MODAL_TYPES.SBH_CREDENTIAL_CHECK);
                return;
            }

            try {
                const loginResult = await CheckLogin(selectedRepo, authToken);

                if (!loginResult.valid) {
                    clearInvalidCredentials(selectedRepo);
                    setModalData?.(prev => ({
                        ...prev,
                        selectedRepo,
                        expectedEmail,
                        skipRepositorySelection: true,
                    }));
                    showNotification({
                        title: 'Invalid Credentials',
                        message: 'Your login credentials have expired or are invalid. Please log in again.',
                        color: 'orange',
                    });
                    navigateTo(MODAL_TYPES.SBH_CREDENTIAL_CHECK);
                    return;
                }

                const profileEmail = loginResult.profile?.email || '';

                if (expectedEmail && profileEmail.toLowerCase() !== expectedEmail.toLowerCase()) {
                    clearInvalidCredentials(selectedRepo);
                    
                    showNotification({
                        title: 'Account Mismatch',
                        message: `You must be logged in as ${expectedEmail}. Currently logged in as ${profileEmail}.`,
                        color: 'red',
                    });
                    
                    setModalData?.(prev => ({
                        ...prev,
                        selectedRepo,
                        expectedEmail,
                        skipRepositorySelection: true,
                    }));
                    navigateTo(MODAL_TYPES.SBH_CREDENTIAL_CHECK);
                    return;
                }

                setModalData?.(prev => ({
                    ...prev,
                    userInfo: {
                        name: loginResult.profile?.name || repoInfo.name || 'Unknown',
                        username: loginResult.profile?.username || repoInfo.username || 'Unknown',
                        email: profileEmail,
                        affiliation: loginResult.profile?.affiliation || repoInfo.affiliation || 'N/A',
                    },
                    authToken,
                    validated: true,
                }));

                setCredentialChecking(false);
            } catch (err) {
                console.error('Credential check error:', err);
                clearInvalidCredentials(selectedRepo);
                
                showNotification({
                    title: 'Credential Check Failed',
                    message: err.message || 'Failed to verify credentials. Please log in again.',
                    color: 'red',
                });
                
                setModalData?.(prev => ({
                    ...prev,
                    selectedRepo,
                    expectedEmail,
                    skipRepositorySelection: true,
                }));
                navigateTo(MODAL_TYPES.SBH_CREDENTIAL_CHECK);
            }
        };

        checkCredentials();
    }, [silentCredentialCheck, selectedRepo, expectedEmail, dataSBH, navigateTo, completeWorkflow, setModalData]);

    const getAuthToken = useCallback(() => {
        const repoUrl = selectedRepo || dataPrimarySBH;
        if (!repoUrl || !dataSBH.length) return null;
        const repo = dataSBH.find(r => r.value === repoUrl);
        return repo?.authtoken || null;
    }, [selectedRepo, dataPrimarySBH, dataSBH]);

    const fetchCollections = useCallback(async (parentUri = null) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setLoading(true);

        try {
            const authToken = getAuthToken();
            const url = selectedRepo || dataPrimarySBH;

            if (!url || url.startsWith('Select')) {
                setCollections([]);
                return;
            }

            let result;
            
            if (!parentUri) {
                result = await searchCollections(url, authToken);
            } else {
                const searchUrl = `https://${url}/search/collection=${encodeURIComponent(parentUri)}/?offset=0&limit=1000`;
                
                const response = await fetch(searchUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/plain',
                        'X-authorization': authToken
                    },
                    signal: abortController.signal
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                result = await response.json();
            }

            if (abortController.signal.aborted || !isMountedRef.current) return;

            const collectionList = Array.isArray(result) 
                ? result 
                : (result?.results && Array.isArray(result.results)) 
                    ? result.results 
                    : [];
            
            setCollections(collectionList);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error fetching collections:', err);
                setCollections([]);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [selectedRepo, dataPrimarySBH, getAuthToken]);

    useEffect(() => {
        fetchCollections();
    }, [fetchCollections]);

    const toggleSelection = useCallback((collection) => {
        setSelectedCollections(prev => {
            const newMap = new Map(prev);
            const isSelected = newMap.has(collection.uri);
            
            if (multiSelect) {
                isSelected ? newMap.delete(collection.uri) : newMap.set(collection.uri, collection);
            } else {
                newMap.clear();
                if (!isSelected) newMap.set(collection.uri, collection);
            }
            
            return newMap;
        });
    }, [multiSelect]);

    const removeSelection = useCallback((uri) => {
        setSelectedCollections(prev => {
            const newMap = new Map(prev);
            newMap.delete(uri);
            return newMap;
        });
    }, []);

    const handleDoubleClick = useCallback(async (collection) => {
        setBreadcrumbs(prev => [...prev, { name: collection.name || collection.displayId, uri: collection.uri }]);
        setCurrentPath(prev => [...prev, collection.uri]);
        await fetchCollections(collection.uri);
    }, [fetchCollections]);

    const navigateToBreadcrumb = useCallback((index) => {
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        const newPath = currentPath.slice(0, index);
        
        setBreadcrumbs(newBreadcrumbs);
        setCurrentPath(newPath);
        fetchCollections(newPath[newPath.length - 1] || null);
    }, [breadcrumbs, currentPath, fetchCollections]);

    const handleComplete = useCallback(() => {
        if (selectedCollections.size === 0) return;

        completeWorkflow({
            collections: Array.from(selectedCollections.values()),
            count: selectedCollections.size,
        });
    }, [selectedCollections, completeWorkflow]);

    const handleCancel = useCallback(() => {
        onCancel ? onCancel() : goBack();
    }, [onCancel, goBack]);

    return (
        <Stack spacing="md" style={{ height: '70vh', display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'stretch', padding: 0 }}>
            <Breadcrumbs style={{ width: '100%' }}>
                {breadcrumbs.map((crumb, index) => (
                    <Anchor
                        key={crumb.uri || 'root'}
                        onClick={() => navigateToBreadcrumb(index)}
                        style={{ cursor: 'pointer' }}
                    >
                        {crumb.name}
                    </Anchor>
                ))}
            </Breadcrumbs>

            {selectedCollections.size > 0 && (
                <Paper p="sm" withBorder>
                    <Text size="sm" weight={500} mb="xs">
                        {multiSelect 
                            ? `Selected Collections (${selectedCollections.size})` 
                            : `Selected Collection`
                        }
                    </Text>
                    <Group spacing="xs">
                        {Array.from(selectedCollections.values()).map(collection => (
                            <Badge
                                key={collection.uri}
                                rightSection={
                                    <ActionIcon
                                        size="xs"
                                        color="blue"
                                        radius="xl"
                                        variant="transparent"
                                        onClick={() => removeSelection(collection.uri)}
                                    >
                                        <FaTimes size={10} />
                                    </ActionIcon>
                                }
                                pr={3}
                            >
                                {collection.displayId}
                            </Badge>
                        ))}
                    </Group>
                </Paper>
            )}

            <Divider />

            <ScrollArea style={{ flex: 1, width: '100%', overflowX: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0, alignItems: 'stretch' }} type="always">
                {loading ? (
                    <Center style={{ height: 300 }}>
                        <Loader />
                    </Center>
                ) : collections.length === 0 ? (
                    <Center style={{ height: 300 }}>
                        <Text color="dimmed">No objects found</Text>
                    </Center>
                ) : (
                    <div style={{ flex: 1, display: 'flex', minHeight: 0, alignItems: 'stretch', width: '100%' }}>
                        <Table highlightOnHover withColumnBorders style={{ display: 'block', width: '100%', tableLayout: 'fixed', minWidth: '100%', flex: '1 1 auto' }}>
                            <colgroup>
                                <col style={{ width: '10%' }} />
                                <col style={{ width: '20%' }} />
                                <col style={{ width: '35%' }} />
                                <col style={{ width: '10%' }} />
                                <col style={{ width: '25%' }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th style={{ width: '8%' }}>Select</th>
                                    <th>Display ID</th>
                                    <th>Name</th>
                                    <th>Version</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {collections.map((collection) => (
                                    <tr
                                        key={collection.uri}
                                        onDoubleClick={() => handleDoubleClick(collection)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleDoubleClick(collection);
                                            }
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                            {multiSelect ? (
                                                <Checkbox
                                                    checked={selectedCollections.has(collection.uri)}
                                                    onChange={() => toggleSelection(collection)}
                                                />
                                            ) : (
                                                <Radio
                                                    checked={selectedCollections.has(collection.uri)}
                                                    onChange={() => toggleSelection(collection)}
                                                />
                                            )}
                                        </td>
                                        <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{collection.displayId}</td>
                                        <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{collection.name}</td>
                                        <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{collection.version}</td>
                                        <td style={{ 
                                            overflowWrap: 'break-word',
                                            wordBreak: 'break-word',
                                            whiteSpace: 'normal'
                                        }}>
                                            {collection.description}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
            </ScrollArea>

            <Group position="apart" mt="md">
                <Button variant="default" onClick={handleCancel}>
                    Cancel
                </Button>
                <Group>
                    {breadcrumbs.length > 1 && (
                        <Button variant="subtle" onClick={() => navigateToBreadcrumb(breadcrumbs.length - 2)}>
                            Back to Parent
                        </Button>
                    )}
                    <Button 
                        onClick={handleComplete}
                        disabled={selectedCollections.size === 0}
                    >
                        {multiSelect 
                            ? `Confirm Selection (${selectedCollections.size})` 
                            : selectedCollections.size > 0 
                                ? 'Confirm Selection' 
                                : 'Select Collection'
                        }
                    </Button>
                </Group>
            </Group>
        </Stack>
    );
}
