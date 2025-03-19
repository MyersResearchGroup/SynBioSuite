import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isOpen: false,
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
    },
});
export const { openModal, closeModal } = loginModalSlice.actions; 
export default loginModalSlice.reducer;