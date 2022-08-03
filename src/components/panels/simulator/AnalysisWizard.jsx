import { useEffect, useState } from 'react'
import { Container, Stepper, Group, Button, Tabs, Space, Title, Text, Center, SimpleGrid, Box, Divider, Badge } from "@mantine/core"
import Dropzone from '../../Dropzone'
import CenteredTitle from '../../CenteredTitle'
import { showNotification } from '@mantine/notifications'
import { TbComponents } from 'react-icons/tb'
import { IoAnalyticsSharp } from 'react-icons/io5'
import { BiWorld } from "react-icons/bi"
import ParameterForm from './ParameterForm'
import ReviewTable from './ReviewTable'
import { ObjectTypes } from '../../../objectTypes'
import { titleFromFileName, useFile } from '../../../redux/slices/workingDirectorySlice'
import { useContext } from 'react'
import { pollStatus, submitAnalysis, terminateAnalysis } from '../../../ibiosim'
import { useRef } from 'react'
import { PanelContext } from './SimulatorPanel'
import { usePanelProperty } from '../../../redux/slices/panelsSlice'
import { useTimeout } from '@mantine/hooks'


export const TabValues = {
    ENVIRONMENT: 'environment',
    PARAMETERS: 'parameters'
}


export default function AnalysisWizard() {    

    const panelId = useContext(PanelContext)

    // file info
    const fileHandle = usePanelProperty(panelId, "fileHandle")
    const panelTitle = titleFromFileName(fileHandle.name)
    
    console.log("Weird bug, panel ID:", panelId)

    const [running, setRunning] = usePanelProperty(panelId, 'running', false)

    // stepper states
    const numSteps = 3
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))

    // Step 1: select component
    const [componentId, setComponentId] = usePanelProperty(panelId, 'component', false)
    const component = useFile(componentId)
    const handleComponentChange = name => {
        setComponentId(name)
    }

    // Step 2: select parameter source
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
        case 0: showNextButton = !!componentId
            break
        case 1: showNextButton = (parameterSource == TabValues.ENVIRONMENT && !!environmentId) ||
            (parameterSource == TabValues.PARAMETERS && formValidated)
            break
    }

    // submission & response tracking
    const [results, setResults] = usePanelProperty(panelId, 'results', false)
    const [orchestrationUris, setOrchestrationUris] = usePanelProperty(panelId, 'orchestrationUris', false)

    const orchestrationUrisRef = useRef(orchestrationUris)  // have to use refs for access from setTimeout callback
    orchestrationUrisRef.current = orchestrationUris

    const pollingTimeout = useTimeout(async () => {

        console.debug(`${panelTitle}: Polling analysis status...`)
        const output = await pollStatus(orchestrationUrisRef.current)

        // if there's no output, quit and start new timeout
        if (!output) {
            pollingTimeout.start()
            return
        }

        setResults(output)
        setRunning(false)

        console.debug(`${panelTitle}: Analysis complete.`)
        showNotification({
            message: `${panelTitle} has finished running.`,
            color: "green"
        })
    }, 5000, { autoInvoke: running })

    const handleAnalysisRun = async () => {
        setRunning(true)

        try {
            // start analysis
            const response = await submitAnalysis(
                component,
                parameterSource ?
                    { parameters: formValues } :
                    { environment }
            )

            setOrchestrationUris(response)
            pollingTimeout.start()

            console.debug(`${panelTitle}: Analysis accepted.`)
        }
        catch (error) {
            handleCancel()
            console.error(`${panelTitle}: Error occurred running analysis:`, error)
            showNotification({
                message: `Encountered an error while running analysis for ${panelTitle}.`,
                color: "red"
            })
        }
    }

    // stop polling interval on unmount
    useEffect(() => pollingTimeout.clear, [])

    const handleCancel = () => {
        setRunning(false)
        pollingTimeout.clear()
        terminateAnalysis(orchestrationUris)
    }


    return (
        <Container style={stepperContainerStyle}>
            <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm">
                <Stepper.Step
                    allowStepSelect={activeStep > 0 && !running}
                    label="Select input file"
                    description="SBOL, SBML, or OMEX"
                    icon={<TbComponents />}
                >
                    <Dropzone
                        allowedTypes={[ObjectTypes.SBOL.id, ObjectTypes.SBML.id, ObjectTypes.OMEX.id]}
                        item={component?.name}
                        onItemChange={handleComponentChange}
                    >
                        Drag & drop a component from the explorer
                    </Dropzone>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 1 && !running}
                    label="Choose parameter source"
                    description="Select archive or manually enter"
                    icon={<BiWorld />}
                >
                    <Space h='xl' />
                    <Tabs position='center' value={parameterSource} onTabChange={setParameterSource} >
                        <Tabs.List grow>
                            <Tabs.Tab value={TabValues.ENVIRONMENT}>
                                Select an environment archive
                            </Tabs.Tab>
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
                            <ParameterForm onValidation={validation => setFormValidated(!validation.hasErrors)} />
                        </Tabs.Panel>
                    </Tabs>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 2 && !running}
                    label="Run analysis"
                    description="Execute on iBioSim server"
                    icon={<IoAnalyticsSharp />}
                    loading={running}
                >
                    <Space h='lg' />
                    <Center>
                        <ReviewTable />
                    </Center>
                </Stepper.Step>
                <Stepper.Completed>
                    <CenteredTitle height={150}>Analysis is in progress...</CenteredTitle>
                    <Button color='red'>Cancel</Button>
                </Stepper.Completed>
            </Stepper>
            <Group position="center" mt="xl">
                {running ?
                    <Button color='red' onClick={handleCancel}>
                        Cancel
                    </Button> :
                    <>
                        <Button
                            variant="default"
                            onClick={prevStep}
                            sx={{ visibility: activeStep == 0 || activeStep == 3 ? 'hidden' : 'visible' }}
                        >
                            Back
                        </Button>
                        {activeStep < 2 ?
                            <Button
                                onClick={nextStep}
                                sx={{ visibility: showNextButton ? 'visible' : 'hidden' }}
                            >
                                Next step
                            </Button> :
                            <Button
                                type="submit"
                                // gradient={{ from: "canvasBlue", to: "indigo" }}
                                gradient={{ from: "blue", to: "indigo" }}
                                variant="gradient"
                                radius="xl"
                                onClick={handleAnalysisRun}
                            >
                                Run Analysis
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
