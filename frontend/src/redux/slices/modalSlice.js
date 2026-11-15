import { createSlice } from '@reduxjs/toolkit';

//TODO: @Kerem-G Modify this so that this file follows Redux serialization practices (remove function typed variables)

const initialState = {
    loginOpen: false,
    microsoftOpen: false,
    
    // Unified modal state
    unifiedModalOpen: false,
    unifiedModalType: null,
    unifiedModalAllowed: [],
    unifiedModalProps: {},
    unifiedModalCallback: null,

    // Pending callback storage executed outside reducers
    _pendingCallback: null,
    _pendingCallbackData: null,
};

export const modalSlice = createSlice({
    name: 'modals',
    initialState,
    reducers: {
        openLogin: (state) => {
            state.loginOpen = true;
        },
        closeLogin: (state) => {
            state.loginOpen = false;
        },
        openMicrosoft: (state) => {
            state.microsoftOpen = true;
        },
        closeMicrosoft: (state) => {
            state.microsoftOpen = false;
        },
        
        // Unified modal actions
        openUnifiedModal: (state, action) => {
            state.unifiedModalOpen = true;
            state.unifiedModalType = action.payload.modalType || null;
            state.unifiedModalAllowed = Array.isArray(action.payload.allowedModals) 
                ? action.payload.allowedModals 
                : [];
            state.unifiedModalProps = action.payload.props || {};
            state.unifiedModalCallback = typeof action.payload.callback === 'function' 
                ? action.payload.callback 
                : null;
        },
        closeUnifiedModal: (state, action) => {
            const callback = state.unifiedModalCallback;
            const data = action && action.payload && action.payload.modalData ? action.payload.modalData : null;
            
            // Reset all unified modal state
            state.unifiedModalOpen = false;
            state.unifiedModalType = null;
            state.unifiedModalAllowed = [];
            state.unifiedModalProps = {};
            state.unifiedModalCallback = null;
            
            // Store callback + data for execution outside reducer
            if (callback && typeof callback === 'function') {
                state._pendingCallback = callback;
                state._pendingCallbackData = data;
            } else {
                state._pendingCallback = null;
                state._pendingCallbackData = null;
            }
        },
        clearPendingCallback: (state) => {
            state._pendingCallback = null;
            state._pendingCallbackData = null;
        },
    },
});

export const { 
    openLogin, closeLogin,
    openMicrosoft, closeMicrosoft,
    openUnifiedModal, closeUnifiedModal, clearPendingCallback,
} = modalSlice.actions;

export default modalSlice.reducer;