import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    bothOpen: false,
    fjOpen: false,
    sbHOpen: false,
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
        }
    },
});
export const { openModal, closeModal, openSBH, closeSBH, openFJ, closeFJ, openDirectory, closeDirectory } = modalSlice.actions; 
export default modalSlice.reducer;