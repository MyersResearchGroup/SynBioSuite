import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    message: "Some Error Has Occured!"
}

export const failureMessageSlice = createSlice({
    name: "failureMessage",
    initialState,
    reducers:{
        setfailureMessage: (state, action) =>{
            state.message = action.payload
        }
    }
})

export const {setfailureMessage} = failureMessageSlice.actions
export default failureMessageSlice.reducer