import { configureStore } from '@reduxjs/toolkit'
import panelsSlice from './slices/panelsSlice'
import workingDirectorySlice from "./slices/workingDirectorySlice"
import activitySlice from "./slices/activitySlice"
import saveIndicatorReducer from './slices/saveIndicatorSlice'
import failureMessageReducer from './slices/failureMessageSlice'
import loginModalReducer from './slices/loginModalSlice'

export default configureStore({
    reducer: {
        activities: activitySlice.reducer,
        workingDirectory: workingDirectorySlice.reducer,
        panels: panelsSlice.reducer,
        saveIndicator: saveIndicatorReducer,
        failureMessage: failureMessageReducer,
        loginModal: loginModalReducer,
    },

    /*  
        Middleware to get rid of the annoying "A non-serializable value" warnings in the devtools.
        Comment it out to check the warnings but don't think it's important
    */
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: false
    })
})

export { panelsSlice, workingDirectorySlice, activitySlice, saveIndicatorReducer, loginModalReducer }