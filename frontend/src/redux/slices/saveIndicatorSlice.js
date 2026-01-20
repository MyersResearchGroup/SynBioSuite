import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    isSaving: false
}

export const saveIndicatorSlice = createSlice({
    name: "saveIndicator",
    initialState,
    reducers:{
        setIsSaving: (state, action) =>{
            state.isSaving = action.payload
        }
    }
})

export const {setIsSaving} = saveIndicatorSlice.actions
export default saveIndicatorSlice.reducer