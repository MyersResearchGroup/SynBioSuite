import { configureStore } from '@reduxjs/toolkit'
import panelsSlice from './slices/panelsSlice'
import workingDirectorySlice from "./slices/workingDirectorySlice"
import activitySlice from "./slices/activitySlice"

export default configureStore({
    reducer: {
        activities: activitySlice.reducer,
        workingDirectory: workingDirectorySlice.reducer,
        panels: panelsSlice.reducer,
    }
})

export { panelsSlice, workingDirectorySlice, activitySlice }