import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocalStorage } from '@mantine/hooks';
import { CheckLogin } from '../API';
import { setSBHPrimary, setFJPrimary } from '../redux/slices/primaryRepositorySlice';

/**
 * Hook that checks stored credentials on app startup
 * - Validates tokens are still active
 * - Clears expired tokens
 * - Returns true when check is complete
 */
export function useAuthCheck() {
    const dispatch = useDispatch();
    
    // Get stored instances from localStorage
    const [dataSBH] = useLocalStorage({ key: 'SynbioHub', defaultValue: [] });
    const [dataFJ] = useLocalStorage({ key: 'Flapjack', defaultValue: [] });
    
    // Get currently selected repositories from Redux
    const selectedSBH = useSelector(state => state.primaryRepository.sbhPrimary);
    const selectedFJ = useSelector(state => state.primaryRepository.fjPrimary);
    
    // Track whether we've finished checking
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const validateStoredCredentials = async () => {

            // Check SynbioHub credentials

            if (selectedSBH) {
                // Find the stored instance that matches the selected one
                const sbhInstance = dataSBH.find(r => r.registryURL === selectedSBH);
                
                // Only validate if an authtoken exists
                if (sbhInstance?.authtoken) {
                    try {
                        // Call CheckLogin to see if the token is still valid
                        // Use registryAPI if available, fallback to registryURL
                        const result = await CheckLogin(
                            sbhInstance.registryAPI || selectedSBH, 
                            sbhInstance.authtoken
                        );
                        
                        // If token is invalid/expired, clear it from Redux
                        if (!result.valid) {
                            console.log('SynbioHub token expired. Keeping repository selected for re-login.');
                        }
                        // If valid, nothing happens - user stays logged in
                    } catch (error) {
                        console.error('SBH credential check failed:', error);
                        // On error, assume token is bad and clear it
                        dispatch(setSBHPrimary(null));
                    }
                }
            }

            // ============================================
            // STEP 2B: Check Flapjack credentials
            // ============================================
            if (selectedFJ) {
                const fjInstance = dataFJ.find(r => r.registryURL === selectedFJ);
                
                if (fjInstance?.authtoken) {
                    try {
                        const result = await CheckLogin(
                            fjInstance.registryAPI || selectedFJ, 
                            fjInstance.authtoken
                        );
                        
                        if (!result.valid) {
                            console.log('Flapjack token expired, clearing...');
                            dispatch(setFJPrimary(null));
                        }
                    } catch (error) {
                        console.error('FJ credential check failed:', error);
                        dispatch(setFJPrimary(null));
                    }
                }
            }

            // ============================================
            // Mark that we've completed the check
            // ============================================
            setChecked(true);
        };

        // Run validation when component mounts or dependencies change
        validateStoredCredentials();
    }, [selectedSBH, selectedFJ, dataSBH, dataFJ, dispatch]);

    return checked;
}