import { createSlice } from '@reduxjs/toolkit'

const primaryRepositorySlice = createSlice({
    name: 'primaryRepository',
    initialState: {
        sbhPrimary: '',
        fjPrimary: '',
    },
    reducers: {
        setSBHPrimary(state, action) {
            state.sbhPrimary = action.payload ?? '';
        },
        setFJPrimary(state, action) {
            state.fjPrimary = action.payload ?? '';
        },
    },
})

export const { setSBHPrimary, setFJPrimary } = primaryRepositorySlice.actions
export default primaryRepositorySlice
