import { configureStore } from '@reduxjs/toolkit'
import activityReducer from "./slices/activitySlice"
import workingDirectoryReducer from "./slices/workingDirectorySlice"
import panelReducer from "./slices/panelSlice"

export default configureStore({
    reducer: {
        activities: activityReducer,
        workingDirectory: workingDirectoryReducer,
        panels: panelReducer,
    }
})