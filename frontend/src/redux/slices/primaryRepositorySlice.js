import { createSlice } from '@reduxjs/toolkit'
import { getPrimaryRepository, setPrimaryRepository } from '../../modules/auth/credentialStore'

const primaryRepositorySlice = createSlice({
    name: 'primaryRepository',
    initialState: {
        sbhPrimary: getPrimaryRepository('synbiohub'),
        fjPrimary: getPrimaryRepository('flapjack'),
    },
    reducers: {
        setSBHPrimary(state, action) {
            state.sbhPrimary = action.payload ?? '';
            setPrimaryRepository('synbiohub', state.sbhPrimary);
        },
        setFJPrimary(state, action) {
            state.fjPrimary = action.payload ?? '';
            setPrimaryRepository('flapjack', state.fjPrimary);
        },
    },
})

export const { setSBHPrimary, setFJPrimary } = primaryRepositorySlice.actions
export default primaryRepositorySlice
