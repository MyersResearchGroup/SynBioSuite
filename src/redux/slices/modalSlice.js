import { createSlice } from '@reduxjs/toolkit';

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
    microsoftOpen: false,
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
        openMicrosoft: (state) => {
            state.microsoftOpen = true;
        },
        closeMicrosoft: (state) => {
            state.microsoftOpen = false;
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
    openSBHLogin, closeSBHLogin, openMicrosoft, closeMicrosoft,
} = modalSlice.actions;

export default modalSlice.reducer;