import { useEffect, useState } from 'react'
import { Container, Stepper, Group, Button, Tabs, Space, Title, Text, Center, SimpleGrid, Box, Divider, Badge } from "@mantine/core"
import Dropzone, { MultiDropzone } from '../../Dropzone'
import { TbComponents } from 'react-icons/tb'
import { IoAnalyticsSharp } from 'react-icons/io5'
import { BiWorld } from "react-icons/bi"
import AssemblyForm from './AssemblyForm'
import { ObjectTypes } from '../../../objectTypes'
import { titleFromFileName, useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { useContext } from 'react'
import { useRef } from 'react'
import { PanelContext } from './AssemblyPanel'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { setfailureMessage } from '../../../redux/slices/failureMessageSlice'
import AssemblyReviewTable from './AssemblyReviewTable'
import { submitAssembly } from '../../../SBOL2Build'

export const TabValues = {
    PLASMID: 'plasmid',
    INSERTS: 'inserts',
    PARAMETERS: 'parameters',
    INPUT: 'input'
}

// NOTES 1/22:
/*
 * inserts are not a factor, the assembly involves many plasmids (containing desired parts), which are put together in sbolcanvas
 * create different forms for each type of assembly plan
 *      potentially have synbiohub upload details here
 * change mentions of sbol to assembly plan
 * bp011 = https://github.com/SynBioDex/SBOL-examples/tree/main/SBOL/best-practices/BP011
*/

export default function AssemblyWizard({handleViewResult, isResults}) {
    const panelId = useContext(PanelContext)

    // file info
    const fileHandle = usePanelProperty(panelId, "fileHandle")
    const panelTitle = titleFromFileName(fileHandle.name)

    const [status, setStatus] = useState(false)

    // stepper states
    const numSteps = 3
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))

    // Step 1: select plasmid
    const [plasmidId, setplasmidId] = usePanelProperty(panelId, 'backbone', false)
    const acceptorPlasmid = useFile(plasmidId)
    const handlePlasmidChange = fileNames => {
        setplasmidId(fileNames)
    }

    // Step 2: select part inserts
    const [insertIDs, setInsertIDs] = usePanelProperty(panelId, 'inserts', false, []) || []
    let insertFiles = []
    const handleInsertChange = name => {
        setInsertIDs([...insertIDs, name])
    }

    const handleRemoveInsert = id => {
        const newIDs = insertIDs.filter(item => item !== id)
        setInsertIDs(newIDs)
    }

    // form state
    const formValues = usePanelProperty(panelId, "formValues")
    const [formValidated, setFormValidated] = useState()

    
    // determine if we can move to next step or not
    let showNextButton = false
    switch (activeStep) {
        case 0: showNextButton = !!plasmidId
        break
        case 1: showNextButton = !!acceptorPlasmid
        break
        case 2: showNextButton = true
    }
    
    // submission & response tracking
    const [results, setResults] = usePanelProperty(panelId, 'results', false)
    const [orchestrationUris, setOrchestrationUris] = usePanelProperty(panelId, 'orchestrationUris', false)

    const orchestrationUrisRef = useRef(orchestrationUris)  // have to use refs for access from setTimeout callback
    orchestrationUrisRef.current = orchestrationUris

    const handleAssemblySubmit = async () => {
        setStatus(true)
        
        try {
            // start analysis
            const response = await submitAssembly(
                fileHandle,
                insertFiles,
                acceptorPlasmid
            )
            setStatus(false)
        }
        catch (error) {
            console.log(error)
            setStatus(false)
        }
    }

    const setInsertFileHandles = (fileHandles) => {
        insertFiles = fileHandles
    }

    return (
        <Container style={stepperContainerStyle}>
            <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm">
                <Stepper.Step
                    allowStepSelect={activeStep > 0 || status}
                    label="Select Plasmid Backbone"
                    description="SBOL Component"
                    icon={<TbComponents />}
                >
                    <Dropzone
                        allowedTypes={[ObjectTypes.SBOL.id, ObjectTypes.Plasmids.id]}
                        item={acceptorPlasmid?.name}
                        onItemChange={handlePlasmidChange}
                        multiple={true}
                    >
                        Drag & drop a component from the explorer
                    </Dropzone>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 1 || status}
                    label="Choose part inserts"
                    description="SBOL Component"
                    icon={<BiWorld />}
                >
                    <Space h='xl' />
                        <h2 style={{ textAlign: 'center' }}>Upload Part Inserts</h2>
                        <MultiDropzone
                            allowedTypes={[ObjectTypes.SBOL.id, ObjectTypes.Plasmids.id]} 
                            items={insertIDs}
                            onItemsChange={handleInsertChange}
                            onRemoveItem={handleRemoveInsert}
                            multiple={true}
                        >
                            Drag & drop inserts from the explorer 
                        </MultiDropzone>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 2 || status}
                    label="Enter Parameters"
                    description="Choose assembly type"
                    icon={<BiWorld />}
                >
                    <Space h='xl' />
                        <h2 style={{ textAlign: 'center' }}>Enter Assembly Parameters</h2>
                            <AssemblyForm/>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 3 || status}
                    label="Generate SBOL"
                    description=""
                    icon={<IoAnalyticsSharp />}
                    loading={status}
                >
                    <Space h='lg' />
                        <Group grow style={{ alignItems: 'flex-start' }}>
                            <AssemblyReviewTable onInsertFilesReady={setInsertFileHandles}/>
                        </Group>
                </Stepper.Step>
            </Stepper>
            <Group position="center" mt="xl">
                {status ?
                    <>
                        <Button color='red' onClick={() => setStatus(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="default"
                            onClick={prevStep}
                            sx={{ display: activeStep == 0 || activeStep == 3 ? 'none' : 'block' }}
                        >
                            Back
                        </Button>
                        <Button
                            onClick={nextStep}
                            sx={{ display: showNextButton ? 'block' : 'none' }}
                        >
                                Next step
                        </Button> <></>
                    </> :
                    <>
                        <Button
                            variant="default"
                            onClick={prevStep}
                            sx={{ display: activeStep == 0 || activeStep == 3 ? 'none' : 'block' }}
                        >
                            Back
                        </Button>
                        {activeStep < 3 ?
                            <Button
                                onClick={nextStep}
                                sx={{ display: showNextButton ? 'block' : 'none' }}
                            >
                                Next step
                            </Button> :
                            <Button
                                type="submit"
                                gradient={{ from: "blue", to: "indigo" }}
                                variant="gradient"
                                radius="xl"
                                onClick={handleAssemblySubmit}
                            >
                                Generate SBOL
                            </Button>}  
                        {isResults && activeStep === 2 && <Button
                            gradient={{ from: "green", to: "green" }}
                            variant="gradient"
                            radius="xl"
                            onClick={handleViewResult}
                        >   View Results
                        </Button>}                  
                    </>}
            </Group>
        </Container>
    )
}


const stepperContainerStyle = {
    marginTop: 40,
    padding: '0 40px',
    flexDirection: 'column'
}
