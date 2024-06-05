import { configureStore } from '@reduxjs/toolkit'
import panelsSlice from './slices/panelsSlice'
import workingDirectorySlice from "./slices/workingDirectorySlice"
import activitySlice from "./slices/activitySlice"
import saveSlice from './slices/saveSlice'

export default configureStore({
    reducer: {
        activities: activitySlice.reducer,
        workingDirectory: workingDirectorySlice.reducer,
        panels: panelsSlice.reducer,
        save: saveSlice
    }
})

export { panelsSlice, workingDirectorySlice, activitySlice, saveSlice }