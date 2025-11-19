import { useState, useEffect, useCallback, useRef } from 'react';
import { Stack, Button, Group, Text, Alert, Loader, Center, Paper, Avatar } from '@mantine/core';
import { FaExclamationCircle, FaCheck, FaTimes } from 'react-icons/fa';
import { useLocalStorage } from '@mantine/hooks';
import { CheckLogin, SBHLogout } from '../../API';
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
    const previousValidState = useRef(null); // Track previous valid state to detect login changes

    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const selectedRepo = modalData.selectedRepo || dataPrimarySBH;

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
                const valid = await CheckLogin(selectedRepo, authToken);

                if (!isMountedRef.current) return;

                if (valid) {
                    setIsValid(true);
                    setUserInfo({
                        name: repoInfo.name || 'Unknown',
                        username: repoInfo.username || 'Unknown',
                        email: repoInfo.email || 'Unknown',
                        affiliation: repoInfo.affiliation || 'N/A',
                    });
                    
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
                    // Invalid token, logout user
                    setIsValid(false);
                    setUserInfo(null);
                    previousValidState.current = false;
                    
                    // Auto-logout
                    try {
                        await SBHLogout(authToken, selectedRepo);
                    } catch (err) {
                        console.error('Logout error:', err);
                    }

                    // Clear token from localStorage
                    const updated = dataSBH.map(item => 
                        item.value === selectedRepo 
                            ? { ...item, authtoken: '' }
                            : item
                    );
                    setDataSBH(updated);

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
            } finally {
                if (isMountedRef.current) {
                    setChecking(false);
                }
            }
        };

        checkCredentials();
    }, [selectedRepo, getRepoInfo, dataSBH, setDataSBH]);

    const handleLogin = useCallback(() => {
        // Navigate to login modal
        navigateTo(MODAL_TYPES.SBH_LOGIN);
    }, [navigateTo]);

    const handleConfirm = useCallback(() => {
        if (!isValid) return;

        // Store user info and proceed to collection browser
        if (setModalData) {
            setModalData(prev => ({ 
                ...prev, 
                userInfo,
                authToken: getRepoInfo()?.authtoken 
            }));
        }

        navigateTo(MODAL_TYPES.COLLECTION_BROWSER);
    }, [isValid, userInfo, navigateTo, setModalData, getRepoInfo]);

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

    if (checking) {
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

            {error && (
                <Alert icon={<FaExclamationCircle size={16} />} color="red">
                    {error}
                </Alert>
            )}

            {isValid === false && (
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
                <Button variant="default" onClick={() => goBack()}>
                    Back
                </Button>
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
