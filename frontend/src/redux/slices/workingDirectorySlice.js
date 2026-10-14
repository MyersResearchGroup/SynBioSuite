import { createEntityAdapter, createSlice } from "@reduxjs/toolkit"


const workDirAdapter = createEntityAdapter()
const initialState = workDirAdapter.getInitialState({
    uploadRevision: 0
})

const workDirSlice = createSlice({
    name: 'workingDirectory',
    initialState,
    reducers: {
        addFile: workDirAdapter.addOne,
        addFiles: workDirAdapter.addMany,
        setFiles: workDirAdapter.setAll,
        removeFile: workDirAdapter.removeOne,
        setWorkingDirectory: (state, action) => {
            state.directoryHandle = action.payload
        },
        uploadChanged: state => {
            state.uploadRevision += 1
        },
    }
})


export default {
    reducer: workDirSlice.reducer,
    actions: workDirSlice.actions,
    selectors: workDirAdapter.getSelectors(state => state.workingDirectory),
}