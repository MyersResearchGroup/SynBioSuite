import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    loadingOverlay: false
};

export const overlaySlice = createSlice({
    name: 'overlay',
    initialState,
    reducers: {
        loadOverlay: (state) => {
            state.loadingOverlay = true;
        },
        closeOverlay: (state) => {
            state.loadingOverlay = false;
        },
    },
});

export const {
    loadOverlay, closeOverlay
} = overlaySlice.actions;

export default overlaySlice.reducer;