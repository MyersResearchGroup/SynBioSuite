import { useContext, useState, useEffect, useCallback, useRef } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { PanelContext } from './CollectionPanel'
import { Select, Table, Space, Button, Group, ScrollArea } from '@mantine/core'
import { useLocalStorage } from '@mantine/hooks'
import { useDispatch, useSelector } from 'react-redux'
import { SBHLogout, searchCollections, CheckLogin, clearInvalidCredentials } from '../../../API'
import { showNotification } from '@mantine/notifications'
import { useUnifiedModal } from '../../../redux/hooks/useUnifiedModal'

export default function CollectionInfo() {
    const panelId = useContext(PanelContext)
    const dispatch = useDispatch();
    const { workflows } = useUnifiedModal();

    const sbhLoginOpen = useSelector(state => state.modal.sbhLoginOpen);

    const [dataSBH, setDataSBH] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [dataPrimarySBH, setDataPrimarySBH] = useLocalStorage({ key: "SynbioHub-Primary", defaultValue: [] });

    // JSON object of {description, displayID, name, uri, version}
    const [selectedRow, setSelectedRow] = usePanelProperty(panelId, 'collection', false, {})

    const [collections, setCollections] = useState([])
    const [selectedRepo, setSelectedRepo] = useState('')
    
    // Refs to track async operations and prevent race conditions
    const fetchAbortControllerRef = useRef(null)
    const sessionCheckAbortControllerRef = useRef(null)
    const isLoggingOutRef = useRef(false)
    const isMountedRef = useRef(true)
    const loginPromptShownRef = useRef(false)
    const lastFetchedRepoRef = useRef(null)

    // Allows detection of if modal to add new synbiohub url is open
    const addSBHRepositoryOpened = useSelector((state) => state.modal.addSBHRepository);

    /**
     * Pure function to get auth token without side effects
     * Returns null if no token found
     */
    const getAuthToken = useCallback(() => {
        if (!dataPrimarySBH || typeof dataPrimarySBH !== 'string' || dataPrimarySBH.startsWith('Select')) {
            return null;
        }
        if (!Array.isArray(dataSBH) || dataSBH.length === 0) {
            return null;
        }
        const matchedRepo = dataSBH.find((repo) => repo.value === dataPrimarySBH);
        return matchedRepo?.authtoken || null;
    }, [dataPrimarySBH, dataSBH]);

    /**
     * Check if login prompts should be suppressed (after explicit logout)
     */
    const isLoginSuppressed = useCallback(() => {
        try {
            return localStorage.getItem('SBH_suppressLoginPrompt') === 'true';
        } catch (e) {
            return false;
        }
    }, []);

    /**
     * Clear login suppression flag
     */
    const clearLoginSuppression = useCallback(() => {
        try {
            localStorage.removeItem('SBH_suppressLoginPrompt');
        } catch (e) {
            console.error('Failed to clear login suppression:', e);
        }
    }, []);

    /**
     * Set login suppression flag
     */
    const setLoginSuppression = useCallback(() => {
        try {
            localStorage.setItem('SBH_suppressLoginPrompt', 'true');
        } catch (e) {
            console.error('Failed to set login suppression:', e);
        }
    }, []);

    /**
     * Fetch collections with abort controller for cancellation
     */
    const fetchCollections = useCallback(async (url, authToken, signal) => {
        if (!url || url.startsWith('Select')) {
            return [];
        }

        try {
            // Store which repo we're fetching for race condition detection
            const fetchId = `${url}-${Date.now()}`;
            lastFetchedRepoRef.current = url;

            const result = await searchCollections(url, authToken);
            
            // Check if we've been aborted or if repo changed during fetch
            if (signal?.aborted || lastFetchedRepoRef.current !== url) {
                return null; // Signal that this result should be discarded
            }

            return Array.isArray(result) ? result : [];
        } catch (err) {
            if (signal?.aborted || err.name === 'AbortError') {
                return null; // Aborted, don't update state
            }
            console.error('Error fetching collections:', err);
            return [];
        }
    }, []);

    /**
     * Update collections - used by create collection modal callback
     */
    const updateCollections = useCallback(async () => {
        if (isLoggingOutRef.current) return;
        
        setCollections([]);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!isMountedRef.current || isLoggingOutRef.current) return;

        const authToken = getAuthToken();
        const url = dataPrimarySBH;
        
        const result = await fetchCollections(url, authToken, null);
        if (result !== null && isMountedRef.current && !isLoggingOutRef.current) {
            setCollections(result);
        }
    }, [dataPrimarySBH, getAuthToken, fetchCollections]);

    /**
     * Handle create collection button click
     */
    const handleCreateCollection = useCallback(() => {
        if (isLoggingOutRef.current) return;

        clearLoginSuppression();
        const token = getAuthToken();
        
        if (!token) {
            // Only open login if not already open
            if (!sbhLoginOpen && !loginPromptShownRef.current) {
                loginPromptShownRef.current = true;
                workflows.loginToSBH(() => {
                    loginPromptShownRef.current = false;
                });
            }
            return;
        }

        // Reset login prompt flag when we successfully have a token
        loginPromptShownRef.current = false;

        // Open create collection modal with callback
        workflows.createCollection('', '', () => {
            updateCollections();
        });
    }, [getAuthToken, sbhLoginOpen, dispatch, updateCollections, clearLoginSuppression]);

    /**
     * Handle logout with proper cleanup
     */
    const handleLogout = useCallback(() => {
        // Set flag immediately to prevent any new operations
        isLoggingOutRef.current = true;
        loginPromptShownRef.current = false;

        // Cancel any ongoing fetches
        if (fetchAbortControllerRef.current) {
            fetchAbortControllerRef.current.abort();
            fetchAbortControllerRef.current = null;
        }
        if (sessionCheckAbortControllerRef.current) {
            sessionCheckAbortControllerRef.current.abort();
            sessionCheckAbortControllerRef.current = null;
        }

        const authToken = getAuthToken();
        const actualRepo = dataPrimarySBH;
        
        // Perform logout API call
        if (authToken && actualRepo && actualRepo !== "Select a repository") {
            try {
                SBHLogout(authToken, actualRepo);
            } catch (err) {
                console.error('Logout API error:', err);
            }
        }
        
        // Clear invalid credentials from localStorage
        clearInvalidCredentials(actualRepo);
        setCollections([]);
        
        // Suppress auto re-open of login modal
        setLoginSuppression();

        showNotification({
            title: 'Logout Successful',
            message: 'You have successfully logged out of the repository',
            color: 'green',
        });

        // Reset flag after a short delay to allow state updates to complete
        setTimeout(() => {
            isLoggingOutRef.current = false;
        }, 100);
    }, [dataSBH, dataPrimarySBH, getAuthToken, setDataSBH, setLoginSuppression]);

    /**
     * Handle repository removal
     */
    const handleRemoveInstance = useCallback(() => {
        if (isLoggingOutRef.current) return;

        // Cancel ongoing operations
        if (fetchAbortControllerRef.current) {
            fetchAbortControllerRef.current.abort();
            fetchAbortControllerRef.current = null;
        }

        const updatedInstanceData = dataSBH.filter((item) => item.value !== dataPrimarySBH);
        setDataSBH(updatedInstanceData);
        setDataPrimarySBH("");
        setSelectedRepo("Select a repository");
        setCollections([]);
        
        showNotification({
            title: 'Instance Removed',
            message: 'Repository instance has been removed',
            color: 'blue',
        });
    }, [dataSBH, dataPrimarySBH, setDataSBH, setDataPrimarySBH]);

    /**
     * Handle repository selection change
     */
    const handleRepoChange = useCallback((value) => {
        if (value === 'add-repository') {
            clearLoginSuppression();
            workflows.addRepository('sbh');
        } else {
            if (value !== selectedRepo) {
                // User explicitly selecting repo -> clear suppression and reset flags
                clearLoginSuppression();
                loginPromptShownRef.current = false;
                isLoggingOutRef.current = false;
                
                setSelectedRepo(value);
                setDataPrimarySBH(value);
                
                // Only open login if not already open and we don't have a token
                const hasToken = dataSBH.find(repo => repo.value === value)?.authtoken;
                if (!hasToken && !sbhLoginOpen) {
                    workflows.loginToSBH(() => {
                        loginPromptShownRef.current = false;
                    });
                }
            }
        }
    }, [selectedRepo, dataSBH, sbhLoginOpen, workflows, setDataPrimarySBH, clearLoginSuppression]);

    /**
     * Sync selectedRepo with dataPrimarySBH when modal closes or data changes
     */
    useEffect(() => {
        if (addSBHRepositoryOpened || isLoggingOutRef.current) return;

        if (dataPrimarySBH?.length > 0) {
            setSelectedRepo(dataPrimarySBH);
        } else if (dataSBH?.length > 0) {
            setSelectedRepo(dataSBH[0].value);
        } else {
            setSelectedRepo('Select a repository');
        }
    }, [addSBHRepositoryOpened, dataPrimarySBH, dataSBH]);

    /**
     * Fetch collections when repository changes
     */
    useEffect(() => {
        if (isLoggingOutRef.current) return;

        // Cancel previous fetch
        if (fetchAbortControllerRef.current) {
            fetchAbortControllerRef.current.abort();
        }

        // Create new abort controller
        const abortController = new AbortController();
        fetchAbortControllerRef.current = abortController;

        const timer = setTimeout(async () => {
            if (abortController.signal.aborted || isLoggingOutRef.current) return;

            const authToken = getAuthToken();
            const url = dataPrimarySBH;

            const result = await fetchCollections(url, authToken, abortController.signal);
            
            if (result !== null && !abortController.signal.aborted && isMountedRef.current && !isLoggingOutRef.current) {
                setCollections(result);
            }
        }, 500);

        return () => {
            clearTimeout(timer);
            abortController.abort();
        };
    }, [dataPrimarySBH, getAuthToken, fetchCollections]);

    /**
     * Session check with abort controller
     */
    useEffect(() => {
        if (isLoggingOutRef.current) return;

        // Cancel previous session check
        if (sessionCheckAbortControllerRef.current) {
            sessionCheckAbortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        sessionCheckAbortControllerRef.current = abortController;

        const checkSession = async () => {
            // Guard: need a valid repo
            if (!dataPrimarySBH || typeof dataPrimarySBH !== 'string' || dataPrimarySBH.startsWith('Select')) {
                return;
            }

            // If user explicitly logged out, don't check session
            if (isLoginSuppressed() || isLoggingOutRef.current) {
                return;
            }

            const authToken = getAuthToken();
            
            // If no token and login not suppressed, prompt once
            if (!authToken) {
                if (!sbhLoginOpen && !loginPromptShownRef.current) {
                    loginPromptShownRef.current = true;
                    workflows.loginToSBH(() => {
                        loginPromptShownRef.current = false;
                    });
                }
                return;
            }

            // Reset login prompt flag when we have a token
            loginPromptShownRef.current = false;

            try {
                const loginResult = await CheckLogin(dataPrimarySBH, authToken);
                
                // Check if aborted during async operation
                if (abortController.signal.aborted || isLoggingOutRef.current || !isMountedRef.current) {
                    return;
                }

                // Only logout if session explicitly invalid (not network error)
                if (!loginResult.valid) {
                    showNotification({
                        title: 'Session expired',
                        message: 'Your authentication session has expired.',
                        color: 'red',
                    });
                    handleLogout();
                }
            } catch (error) {
                // Don't auto-logout on network errors or aborted requests
                if (error.name !== 'AbortError') {
                    console.error('Error checking login status:', error);
                }
            }
        };

        const timer = setTimeout(checkSession, 800);
        
        return () => {
            clearTimeout(timer);
            abortController.abort();
        };
    }, [dataPrimarySBH, getAuthToken, handleLogout, isLoginSuppressed, sbhLoginOpen, dispatch]);

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            
            // Cancel all ongoing operations
            if (fetchAbortControllerRef.current) {
                fetchAbortControllerRef.current.abort();
            }
            if (sessionCheckAbortControllerRef.current) {
                sessionCheckAbortControllerRef.current.abort();
            }
        };
    }, []);

    return (
        <>
            <Select
                data={[
                    {
                        value: 'Select a repository',
                        label: 'Select a repository',
                        disabled: true
                    },
                    ...dataSBH.map((sbh) => ({
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
                ]}
                placeholder="Select a repository"
                label="Repository"
                fullWidth
                withAsterisk
                value={selectedRepo}
                onChange={handleRepoChange}
            />

            <Space h="xl" />
            <ScrollArea style={{ height: 400 }} type="always">
                <Table highlightOnHover withColumnBorders style={{ minWidth: '100%', tableLayout: 'fixed' }}>
                    <thead>
                        <tr>
                            <th>Display ID</th>
                            <th>Name</th>
                            <th>Version</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.isArray(collections) && collections.map((row) => (
                            <tr
                                key={row.uri}
                                style={{
                                    cursor: 'pointer',
                                    background: selectedRow.uri === row.uri ? '#3b5bdb' : undefined,
                                    color: selectedRow.uri === row.uri ? 'white' : undefined
                                }}
                                onClick={() => setSelectedRow(row)}
                            >
                                <td style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{row.displayId}</td>
                                <td style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{row.name}</td>
                                <td style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{row.version}</td>
                                <td style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{row.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </ScrollArea>

            <Space h="xl" />
            <Group position="center">
                {dataSBH.some(repo => repo.value === dataPrimarySBH) &&
                <Button onClick={handleCreateCollection} color="blue">Create Collection</Button>}
                {dataSBH.some(repo => repo.value === dataPrimarySBH) && getAuthToken() ? (
                    <Button onClick={handleLogout} color="blue">Logout</Button>
                ) : <Button onClick={() => workflows.loginToSBH(() => { loginPromptShownRef.current = false; })} color="blue">Login</Button>}
                {selectedRepo !== "Select a repository" && (
                    <Button onClick={handleRemoveInstance} color="blue">Remove Instance</Button>
                )}
            </Group>
        </>
    )
}