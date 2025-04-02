import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isOpen: false,
    fjOpen: false,
    sbHOpen: false
};

export const loginModalSlice = createSlice({
    name: 'loginModal',
    initialState,
    reducers: {
        openModal: (state) => {
            state.isOpen = true;
        },
        closeModal: (state) => {
            state.isOpen = false;
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
    },
});
export const { openModal, closeModal, openSBH, closeSBH, openFJ, closeFJ } = loginModalSlice.actions; 
export default loginModalSlice.reducer;