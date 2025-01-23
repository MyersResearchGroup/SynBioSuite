import { useEffect, useState } from 'react'
import { Container, Stepper, Group, Button, Tabs, Space, Title, Text, Center, SimpleGrid, Box, Divider, Badge } from "@mantine/core"
import Dropzone from '../../Dropzone'
import CenteredTitle from '../../CenteredTitle'
import { showNotification } from '@mantine/notifications'
import { TbComponents } from 'react-icons/tb'
import { IoAnalyticsSharp } from 'react-icons/io5'
import { BiWorld } from "react-icons/bi"
import AssemblyForm from './AssemblyForm'
// import ReviewTable from './ReviewTable'
import { ObjectTypes } from '../../../objectTypes'
import { titleFromFileName, useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { useContext } from 'react'
import { pollStatus, submitAnalysis, terminateAnalysis } from '../../../ibiosim'
import { useRef } from 'react'
import { PanelContext } from './AssemblyPanel'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { useTimeout } from '@mantine/hooks'
import { RuntimeStatus } from '../../../runtimeStatus'
import { CgCheckO } from "react-icons/cg"
import { useDispatch } from 'react-redux'
import { setfailureMessage } from '../../../redux/slices/failureMessageSlice'

export const TabValues = {
    ENVIRONMENT: 'environment',
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

    // stepper states
    const numSteps = 3
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))

    // Step 1: select plasmids
    const [plasmidId, setplasmidId] = usePanelProperty(panelId, 'components', false, [])
    const component = useFile(plasmidId)
    const handleComponentChange = fileNames => {
        setplasmidId(fileNames)
    }
    const isComponentOMEX = component?.objectType == ObjectTypes.OMEX.id

    // Step 2: select part inserts
    const [parameterSource, setParameterSource] = usePanelProperty(panelId, 'parameterSource', false, TabValues.ENVIRONMENT)
    const [environmentId, setEnvironmentId] = usePanelProperty(panelId, 'environment', false)
    const environment = useFile(environmentId)
    const handleEnvironmentChange = name => {
        setEnvironmentId(name)
    }

    // form state
    const formValues = usePanelProperty(panelId, "formValues")
    const [formValidated, setFormValidated] = useState()

    
    // determine if we can move to next step or not
    let showNextButton = false
    switch (activeStep) {
        case 0: showNextButton = !!plasmidId
        break
        case 1: showNextButton =
        (parameterSource == TabValues.ENVIRONMENT && !!environmentId) ||
        // (parameterSource == TabValues.PARAMETERS && formValidated) ||
        (parameterSource == TabValues.PARAMETERS && true) ||
        parameterSource == TabValues.INPUT
        break
    }
    
    // submission & response tracking
    const [results, setResults] = usePanelProperty(panelId, 'results', false)
    const [orchestrationUris, setOrchestrationUris] = usePanelProperty(panelId, 'orchestrationUris', false)

    const orchestrationUrisRef = useRef(orchestrationUris)  // have to use refs for access from setTimeout callback
    orchestrationUrisRef.current = orchestrationUris

    return (
        <Container style={stepperContainerStyle}>
            <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm">
                <Stepper.Step
                    allowStepSelect={activeStep > 0}
                    label="Select Plasmid Backbone"
                    description="SBOL, SBML, or OMEX"
                    icon={<TbComponents />}
                >
                    <Dropzone
                        allowedTypes={[ObjectTypes.SBOL.id, ObjectTypes.SBML.id, ObjectTypes.OMEX.id]}
                        item={component?.name}
                        onItemChange={handleComponentChange}
                        multiple={true}
                    >
                        Drag & drop a component from the explorer
                    </Dropzone>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 1}
                    label="Choose part inserts"
                    description="Select archive or manually enter"
                    icon={<BiWorld />}
                >
                    <Space h='xl' />
                    <Tabs position='center' value={parameterSource} onTabChange={setParameterSource} >
                        <Tabs.List grow>
                            {isComponentOMEX ?
                                <Tabs.Tab value={TabValues.INPUT}>
                                    Use parameters from input archive
                                </Tabs.Tab> :
                                <Tabs.Tab value={TabValues.ENVIRONMENT}>
                                    Upload Part Inserts
                                </Tabs.Tab>}
                            <Tabs.Tab value={TabValues.PARAMETERS}>
                                Manually enter parameters
                            </Tabs.Tab>
                        </Tabs.List>
                        <Tabs.Panel value={TabValues.ENVIRONMENT}>
                            <Dropzone
                                allowedTypes={[ObjectTypes.OMEX.id]}
                                item={environment?.name}
                                onItemChange={handleEnvironmentChange}
                            >
                                Drag & drop an environment from the explorer
                            </Dropzone>
                        </Tabs.Panel>
                        <Tabs.Panel value={TabValues.PARAMETERS}>
                            {/* replace with assembly relevant parameterform */}
                            <AssemblyForm/>
                        </Tabs.Panel>
                        <Tabs.Panel value={TabValues.INPUT}>
                            <CenteredTitle color="green" leftIcon={<CgCheckO />} height={100}>{component?.name}</CenteredTitle>
                        </Tabs.Panel>
                    </Tabs>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 2}
                    label="Generate SBOL"
                    description=""
                    icon={<IoAnalyticsSharp />}
                    loading={false}
                >
                    <Space h='lg' />
                </Stepper.Step>
                <Stepper.Completed>
                    <CenteredTitle height={150}>Analysis is in progress...</CenteredTitle>
                    <Button color='red'>Cancel</Button>
                </Stepper.Completed>
            </Stepper>
            <Group position="center" mt="xl">
                {false ?
                    <Button color='red' onClick={() => cancelAnalysis(RuntimeStatus.CANCELLED)}>
                        Cancel
                    </Button> :
                    <>
                        <Button
                            variant="default"
                            onClick={prevStep}
                            sx={{ display: activeStep == 0 || activeStep == 3 ? 'none' : 'block' }}
                        >
                            Back
                        </Button>
                        {activeStep < 2 ?
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
