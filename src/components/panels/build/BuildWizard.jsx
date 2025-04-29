import { useState } from 'react'
import { Container, Title } from "@mantine/core"
import { ObjectTypes } from '../../../objectTypes'
import { useFile, titleFromFileName } from '../../../redux/hooks/workingDirectoryHooks'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { useContext } from 'react'
import { useSelector } from 'react-redux'
import { PanelContext } from './BuildPanel'
import Dropzone from '../../Dropzone' // adjust import if needed

export default function BuildWizard({}) {
    const panelId = useContext(PanelContext)
    const workDir = useSelector(state => state.workingDirectory.directoryHandle)

    // file info
    const fileHandle = usePanelProperty(panelId, "fileHandle")
    const panelTitle = titleFromFileName(fileHandle.name)

    const [assemblyPlanId, setAssemblyPlanId] = usePanelProperty(panelId, 'assemblyPlan', false)
    const assemblyPlan = useFile(assemblyPlanId)
    const handleAssemblyPlanChange = fileName => { // TODO: add logic to see if returned from backend or not
        setAssemblyPlanId(fileName) 
    }

    return (
        <Container style={{ marginTop: 40, padding: '0 40px' }}>
            <Title order={3} align="center" mb="md">
            Upload Assembly Plan
            </Title>
            <Dropzone
            allowedTypes={ObjectTypes.Assembly.id}
            item={assemblyPlan?.name}
            onItemChange={handleAssemblyPlanChange}
            multiple={false}
            >
            Drag & drop assemblyPlan file here
            </Dropzone>
        </Container>
    )
}
