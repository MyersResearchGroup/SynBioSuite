import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    bothOpen: false,
    fjOpen: false,
    sbHOpen: false,
    iframesOpen: false,
    directoryOpen: false
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
        openIframes: (state) => {
            state.iframesOpen = true;
        },
        closeIframes: (state) => {
            state.iframesOpen = false;
        },
    },
});
export const { openModal, closeModal, openSBH, closeSBH, openFJ, closeFJ, openDirectory, closeDirectory, openIframes, closeIframes } = modalSlice.actions; 
export default modalSlice.reducer;