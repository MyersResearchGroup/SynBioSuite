import { createSlice } from '@reduxjs/toolkit';

//TODO: @Kerem-G Modify this so that this file follows Redux serialization practices (remove function typed variables)

const initialState = {
    bothOpen: false,
    fjOpen: false,
    sbHOpen: false,
    directoryOpen: false,
    addSBHrepository: false,
    addFJrepository: false,
    addCollections: false,
    sbhLoginOpen: false,
    callback: null,
    libraryName: null,
    libraryDescription: null,
    
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
        openModal: (state) => {
            state.bothOpen = true;
        },
        closeModal: (state) => {
            state.bothOpen = false;
        },
        openSBH: (state) => {
            state.sbhOpen = true;
        },
        closeSBH: (state) => {
            state.sbhOpen = false;
        },
        openFJ: (state) => {
            state.fjOpen = true;
        },
        closeFJ: (state) => {
            state.fjOpen = false;
        },
        openDirectory: (state) => {
            state.directoryOpen = true;
        },
        closeDirectory: (state) => {
            state.directoryOpen = false;
        },
        openAddSBHrepository: (state) => {
            state.addSBHrepository = true;
        },
        closeAddSBHrepository: (state) => {
            state.addSBHrepository = false;
        },
        openAddFJrepository: (state, action) => {
            state.addFJrepository = true;
            state.callback = typeof action.payload.callback === 'function' ? action.payload.callback : null
        },
        closeAddFJrepository: (state) => {
            state.addFJrepository = false;
            if (state.callback && typeof state.callback === 'function') {
                state.callback();
                state.callback = null;
            }
        },
        openCreateCollection: (state, action) => {
            state.addCollections = true;
            state.callback = typeof action.payload.callback === 'function' ? action.payload.callback : null
            state.libraryName = typeof action.payload.libraryName === 'string' ? action.payload.libraryName : null
            state.libraryDescription = typeof action.payload.libraryDescription === 'string' ? action.payload.libraryDescription : null
        },
        closeCreateCollection: (state) => {
            state.addCollections = false;
            if (state.callback && typeof state.callback === 'function') {
                state.callback();
                state.callback = null;
            }
        },
        openSBHLogin: (state) => {
            state.sbhLoginOpen = true;
        },
        closeSBHLogin: (state) => {
            state.sbhLoginOpen = false;
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
    openModal, closeModal,
    openSBH, closeSBH,
    openFJ, closeFJ,
    openDirectory, closeDirectory,
    openAddSBHrepository, closeAddSBHrepository,
    openAddFJrepository, closeAddFJrepository,
    openCreateCollection, closeCreateCollection,
    openSBHLogin, closeSBHLogin,
    openUnifiedModal, closeUnifiedModal, clearPendingCallback,
} = modalSlice.actions;

export default modalSlice.reducer;