import { createSlice } from '@reduxjs/toolkit'

const primaryRepositorySlice = createSlice({
    name: 'primaryRepository',
    initialState: {
        sbhPrimary: '',
        fjPrimary: '',
        bobPrimary: '',
    },
    reducers: {
        setSBHPrimary(state, action) {
            state.sbhPrimary = action.payload ?? '';
        },
        setFJPrimary(state, action) {
            state.fjPrimary = action.payload ?? '';
        },
        setBOBPrimary(state, action) {
            state.bobPrimary = action.payload ?? '';
        },
    },
})

export const { setSBHPrimary, setFJPrimary, setBOBPrimary } = primaryRepositorySlice.actions
export default primaryRepositorySlice
