import { useState, useEffect, useCallback, useRef } from 'react';
import { Stack, Button, Group, Text, Alert, Loader, Center, Paper, Avatar } from '@mantine/core';
import { FaExclamationCircle, FaCheck, FaTimes } from 'react-icons/fa';
import { useLocalStorage } from '@mantine/hooks';
import { CheckLogin, SBHLogout, clearInvalidCredentials } from '../../API';
import { showNotification } from '@mantine/notifications';
import { MODAL_TYPES } from './unifiedModal';

/**
 * Credential Verification Modal - Step 2 of the workflow
 * Checks if user is logged in and validates credentials
 */
export default function CredentialCheckModal({ 
    navigateTo, 
    goBack, 
    completeWorkflow,
    modalData = {},
    setModalData 
}) {
    const [dataSBH, setDataSBH] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [dataPrimarySBH] = useLocalStorage({ key: "SynbioHub-Primary", defaultValue: "" });
    
    const [checking, setChecking] = useState(true);
    const [isValid, setIsValid] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [error, setError] = useState(null);
    const [emailMismatch, setEmailMismatch] = useState(false);
    const [autoNavigating, setAutoNavigating] = useState(false);
    const previousValidState = useRef(null); // Track previous valid state to detect login changes

    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const selectedRepo = modalData.selectedRepo || dataPrimarySBH;
    const expectedEmail = modalData.expectedEmail;
    const skipRepositorySelection = modalData.skipRepositorySelection;

    // Get auth token and user info
    const getRepoInfo = useCallback(() => {
        if (!selectedRepo || !dataSBH.length) return null;
        return dataSBH.find(r => r.value === selectedRepo);
    }, [selectedRepo, dataSBH]);

    // Check credentials on mount and when triggered (e.g., after returning from login)
    useEffect(() => {
        const checkCredentials = async () => {
            setChecking(true);
            setError(null);

            const repoInfo = getRepoInfo();
            
            if (!repoInfo) {
                setError('Repository not found');
                setChecking(false);
                setIsValid(false);
                return;
            }

            const authToken = repoInfo.authtoken;

            // No token = not logged in
            if (!authToken) {
                setIsValid(false);
                setChecking(false);
                setUserInfo(null);
                previousValidState.current = false;
                return;
            }

            // Have token, check if it's valid
            try {
                const loginResult = await CheckLogin(selectedRepo, authToken);

                if (!isMountedRef.current) return;

                if (loginResult.valid) {
                    const actualEmail = repoInfo.email || '';
                    const profileEmail = loginResult.profile?.email || '';
                    
                    console.log('Credential check - Profile email:', profileEmail, 'Stored email:', actualEmail, 'Expected:', expectedEmail);
                    
                    // If expectedEmail is provided (resource selection mode), validate it FIRST
                    if (expectedEmail && skipRepositorySelection) {
                        // Use profile email from SynbioHub for accurate comparison
                        const emailToCheck = profileEmail || actualEmail;
                        
                        if (emailToCheck.toLowerCase() !== expectedEmail.toLowerCase()) {
                            setEmailMismatch(true);
                            setIsValid(false);
                            setError(`Email mismatch: Expected ${expectedEmail}, but logged in as ${emailToCheck}`);
                            setChecking(false);
                            
                            showNotification({
                                title: 'Email Mismatch',
                                message: `You must be logged in as ${expectedEmail} to select this resource. Currently logged in as ${emailToCheck}.`,
                                color: 'red',
                            });
                            
                            // Clear invalid credentials and force re-login
                            clearInvalidCredentials(selectedRepo);
                            
                            // Don't abort - allow user to re-login with correct account
                            setEmailMismatch(true);
                            return;
                        }
                        
                        // Email matches and credentials are valid
                        // Store user info and auto-navigate to collection browser WITHOUT showing UI
                        setAutoNavigating(true);
                        
                        if (setModalData) {
                            setModalData(prev => ({ 
                                ...prev, 
                                userInfo: {
                                    name: loginResult.profile?.name || repoInfo.name || 'Unknown',
                                    username: loginResult.profile?.username || repoInfo.username || 'Unknown',
                                    email: profileEmail || actualEmail,
                                    affiliation: loginResult.profile?.affiliation || repoInfo.affiliation || 'N/A',
                                },
                                authToken: authToken,
                                validated: true,
                            }));
                        }
                        
                        // Keep checking state true to prevent UI flash, navigate immediately
                        navigateTo(MODAL_TYPES.COLLECTION_BROWSER);
                        return;
                    }
                    
                    // Standard credential check (not resource selection)
                    setIsValid(true);
                    setUserInfo({
                        name: loginResult.profile?.name || repoInfo.name || 'Unknown',
                        username: loginResult.profile?.username || repoInfo.username || 'Unknown',
                        email: profileEmail || actualEmail,
                        affiliation: loginResult.profile?.affiliation || repoInfo.affiliation || 'N/A',
                    });
                    setChecking(false);
                    
                    // Show success notification if we just logged in (transitioned from invalid to valid)
                    if (previousValidState.current === false) {
                        showNotification({
                            title: 'Login Successful',
                            message: 'Credentials verified successfully!',
                            color: 'green',
                        });
                    }
                    previousValidState.current = true;
                } else {
                    // Invalid token, clear credentials and logout user
                    setIsValid(false);
                    setUserInfo(null);
                    previousValidState.current = false;
                    
                    // Auto-logout
                    try {
                        await SBHLogout(authToken, selectedRepo);
                    } catch (err) {
                        console.error('Logout error:', err);
                    }

                    // Clear invalid credentials from localStorage
                    clearInvalidCredentials(selectedRepo);

                    showNotification({
                        title: 'Session Expired',
                        message: 'Your authentication session has expired. Please log in again.',
                        color: 'orange',
                    });
                }
            } catch (err) {
                console.error('Credential check error:', err);
                setError(err.message || 'Failed to verify credentials');
                setIsValid(false);
                setChecking(false);
            }
        };

        checkCredentials();
    }, [selectedRepo, getRepoInfo, dataSBH, setDataSBH, expectedEmail, skipRepositorySelection, completeWorkflow, setModalData, navigateTo]);

    const handleLogin = useCallback(() => {
        // In resource selection mode with email mismatch, prevent login
        // User must use the correct account, not switch to a different one
        if (skipRepositorySelection && expectedEmail && emailMismatch) {
            showNotification({
                title: 'Cannot Change Account',
                message: `This resource requires login as ${expectedEmail}. Please cancel and use the correct account.`,
                color: 'red',
            });
            return;
        }
        
        // Navigate to login modal
        navigateTo(MODAL_TYPES.SBH_LOGIN);
    }, [navigateTo, skipRepositorySelection, expectedEmail, emailMismatch]);

    const handleConfirm = useCallback(() => {
        if (!isValid) return;

        // Store user info and proceed to collection browser
        if (setModalData) {
            setModalData(prev => ({ 
                ...prev, 
                userInfo,
                authToken: getRepoInfo()?.authtoken,
                validated: skipRepositorySelection ? true : undefined, // Mark as validated for resource selection
            }));
        }

        navigateTo(MODAL_TYPES.COLLECTION_BROWSER);
    }, [isValid, userInfo, navigateTo, setModalData, getRepoInfo, skipRepositorySelection]);

    const handleLogout = useCallback(async () => {
        const repoInfo = getRepoInfo();
        if (!repoInfo?.authtoken) return;

        try {
            await SBHLogout(repoInfo.authtoken, selectedRepo);
        } catch (err) {
            console.error('Logout error:', err);
        }

        // Clear token
        const updated = dataSBH.map(item => 
            item.value === selectedRepo 
                ? { ...item, authtoken: '' }
                : item
        );
        setDataSBH(updated);

        setIsValid(false);
        setUserInfo(null);

        showNotification({
            title: 'Logged Out',
            message: 'You have been logged out successfully.',
            color: 'blue',
        });
    }, [getRepoInfo, selectedRepo, dataSBH, setDataSBH]);

    if (checking || autoNavigating) {
        return (
            <Stack spacing="md">
                <Center style={{ minHeight: 200 }}>
                    <Stack align="center" spacing="md">
                        <Loader size="lg" />
                        <Text color="dimmed">Verifying credentials...</Text>
                    </Stack>
                </Center>
            </Stack>
        );
    }

    return (
        <Stack spacing="md">
            <Text size="lg" weight={500}>Credential Verification</Text>
            
            {skipRepositorySelection && expectedEmail && (
                <Alert icon={<FaExclamationCircle size={16} />} color="blue">
                    This resource requires login as <strong>{expectedEmail}</strong>
                </Alert>
            )}

            {error && (
                <Alert icon={<FaExclamationCircle size={16} />} color="red">
                    {error}
                </Alert>
            )}

            {emailMismatch && (
                <Alert icon={<FaTimes size={16} />} color="red">
                    Email address does not match. Please log in with the correct account or cancel this operation.
                </Alert>
            )}

            {isValid === false && !emailMismatch && (
                <Alert icon={<FaTimes size={16} />} color="orange">
                    You are not logged in to <strong>{selectedRepo}</strong>. Please log in to continue.
                </Alert>
            )}

            {isValid === true && userInfo && (
                <Paper p="md" withBorder>
                    <Group>
                        <Avatar color="blue" radius="xl">
                            {userInfo.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <div style={{ flex: 1 }}>
                            <Text size="sm" color="dimmed">Logged in as</Text>
                            <Text weight={500}>{userInfo.name}</Text>
                            <Text size="xs" color="dimmed">@{userInfo.username}</Text>
                            <Text size="xs">{userInfo.email}</Text>
                            {userInfo.affiliation !== 'N/A' && (
                                <Text size="xs" color="dimmed">{userInfo.affiliation}</Text>
                            )}
                        </div>
                        <FaCheck size={24} color="green" />
                    </Group>
                </Paper>
            )}

            {isValid === true && (
                <Alert icon={<FaCheck size={16} />} color="green">
                    Credentials verified successfully! Confirm to continue.
                </Alert>
            )}

            <Group position="apart" mt="md">
                {!skipRepositorySelection ? (
                    <Button variant="default" onClick={() => goBack()}>
                        Back
                    </Button>
                ) : (
                    <div></div>
                )}
                <Group>
                    {isValid === true && (
                        <Button variant="subtle" color="red" onClick={handleLogout}>
                            Logout
                        </Button>
                    )}
                    {isValid === false && (
                        <Button onClick={handleLogin}>
                            Log In
                        </Button>
                    )}
                    {isValid === true && (
                        <Button onClick={handleConfirm}>
                            Confirm & Continue
                        </Button>
                    )}
                </Group>
            </Group>
        </Stack>
    );
}
