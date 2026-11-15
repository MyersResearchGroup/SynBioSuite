import { Tabs, Center } from '@mantine/core'
import { createContext } from 'react'
import PanelSaver from '../PanelSaver'
import CanvasFrame from './CanvasFrame'
import { useSelector } from 'react-redux'
import { ObjectTypes } from '../../../objectTypes'

export const PanelContext = createContext()

export default function SBOLEditorPanel({id = null, fileObjectTypeId}) {
    fileObjectTypeId=fileObjectTypeId!=ObjectTypes.Devices.id?fileObjectTypeId:ObjectTypes.Plasmids.id
    const activePanel = useSelector(state => state.panels.active)
    return (
        <PanelContext.Provider value={activePanel}>
            <CanvasFrame fileTypeObjectId={fileObjectTypeId}/>
            <PanelSaver id={activePanel} />
        </PanelContext.Provider>
    )
}

const centerStyle = {
    minHeight: '50vh',
    flexDirection: 'column'
}

const tabStyles = theme => ({
    tabControl: {
        width: 120,
        textTransform: 'uppercase',
        fontWeight: 600
    },
    tabsList: {
        // backgroundColor: theme.colors.dark[6]
    }
})