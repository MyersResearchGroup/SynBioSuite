import { useState, useEffect, useCallback, useRef } from 'react';
import { Stack, Button, Group, Text, Alert, Loader, Center, Paper, Avatar } from '@mantine/core';
import { FaExclamationCircle, FaCheck, FaTimes } from 'react-icons/fa';
import { useLocalStorage } from '@mantine/hooks';
import { CheckLogin, SBHLogout, clearInvalidCredentials } from '../../API';
import { showNotification } from '@mantine/notifications';
import { MODAL_TYPES } from './unifiedModal';

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
    const previousValidState = useRef(null);

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

    const getRepoInfo = useCallback(() => {
        if (!selectedRepo || !dataSBH.length) return null;
        return dataSBH.find(r => r.value === selectedRepo);
    }, [selectedRepo, dataSBH]);

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

            if (!authToken) {
                setIsValid(false);
                setChecking(false);
                setUserInfo(null);
                previousValidState.current = false;
                return;
            }

            try {
                const loginResult = await CheckLogin(selectedRepo, authToken);

                if (!isMountedRef.current) return;

                if (loginResult.valid) {
                    const actualEmail = repoInfo.email || '';
                    const profileEmail = loginResult.profile?.email || '';
                    
                    if (expectedEmail && skipRepositorySelection) {
                        const emailToCheck = profileEmail || actualEmail;
                        
                        if (emailToCheck.toLowerCase() !== expectedEmail.toLowerCase()) {
                            setEmailMismatch(true);
                            setIsValid(false);
                            setError(`Email mismatch: Expected ${expectedEmail}, but logged in as ${emailToCheck}`);
                            setChecking(false);
                            
                            showNotification({
                                title: 'Email Mismatch',
                                message: `You must be logged in as ${expectedEmail}. Currently logged in as ${emailToCheck}.`,
                                color: 'red',
                            });
                            
                            clearInvalidCredentials(selectedRepo);
                            setEmailMismatch(true);
                            return;
                        }
                        
                        setAutoNavigating(true);
                        
                        setModalData?.(prev => ({ 
                            ...prev, 
                            userInfo: {
                                name: loginResult.profile?.name || repoInfo.name || 'Unknown',
                                username: loginResult.profile?.username || repoInfo.username || 'Unknown',
                                email: profileEmail || actualEmail,
                                affiliation: loginResult.profile?.affiliation || repoInfo.affiliation || 'N/A',
                            },
                            authToken,
                            validated: true,
                        }));
                        
                        navigateTo(MODAL_TYPES.COLLECTION_BROWSER);
                        return;
                    }
                    
                    setIsValid(true);
                    setUserInfo({
                        name: loginResult.profile?.name || repoInfo.name || 'Unknown',
                        username: loginResult.profile?.username || repoInfo.username || 'Unknown',
                        email: profileEmail || actualEmail,
                        affiliation: loginResult.profile?.affiliation || repoInfo.affiliation || 'N/A',
                    });
                    setChecking(false);
                    
                    if (previousValidState.current === false) {
                        showNotification({
                            title: 'Login Successful',
                            message: 'Credentials verified successfully!',
                            color: 'green',
                        });
                    }
                    previousValidState.current = true;
                } else {
                    setIsValid(false);
                    setUserInfo(null);
                    previousValidState.current = false;
                    
                    try {
                        await SBHLogout(authToken, selectedRepo);
                    } catch (err) {
                        console.error('Logout error:', err);
                    }

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
    }, [selectedRepo, getRepoInfo, dataSBH, setDataSBH, expectedEmail, skipRepositorySelection, setModalData, navigateTo]);

    const handleLogin = useCallback(() => {
        if (skipRepositorySelection && expectedEmail && emailMismatch) {
            showNotification({
                title: 'Cannot Change Account',
                message: `This resource requires login as ${expectedEmail}. Please cancel and use the correct account.`,
                color: 'red',
            });
            return;
        }
        
        navigateTo(MODAL_TYPES.SBH_LOGIN);
    }, [navigateTo, skipRepositorySelection, expectedEmail, emailMismatch]);

    const handleConfirm = useCallback(() => {
        if (!isValid) return;

        setModalData?.(prev => ({ 
            ...prev, 
            userInfo,
            authToken: getRepoInfo()?.authtoken,
            validated: skipRepositorySelection ? true : undefined,
        }));

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

        setDataSBH(dataSBH.map(item => 
            item.value === selectedRepo ? { ...item, authtoken: '' } : item
        ));

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
                {!skipRepositorySelection && (
                    <Button variant="default" onClick={() => goBack()}>
                        Back
                    </Button>
                )}
                <Group ml={skipRepositorySelection ? "auto" : 0}>
                    {isValid === true && (
                        <Button variant="subtle" color="red" onClick={handleLogout}>
                            Logout
                        </Button>
                    )}
                    {isValid === false ? (
                        <Button onClick={handleLogin}>Log In</Button>
                    ) : (
                        <Button onClick={handleConfirm}>Confirm & Continue</Button>
                    )}
                </Group>
            </Group>
        </Stack>
    );
}
