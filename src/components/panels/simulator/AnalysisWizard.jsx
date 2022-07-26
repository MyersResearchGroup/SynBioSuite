import { useState } from 'react'
import { Container, Stepper, Group, Button, Tabs, Space, Title, Text, Center, SimpleGrid, Box, Divider, Badge } from "@mantine/core"
import Dropzone from '../../Dropzone'
import CenteredTitle from '../../CenteredTitle'
import { showNotification } from '@mantine/notifications'
import { TbComponents } from 'react-icons/tb'
import { IoAnalyticsSharp } from 'react-icons/io5'
import { BiWorld } from "react-icons/bi"
import AnalysisForm from './AnalysisForm'
import ReviewTable from './ReviewTable'
import { ObjectTypes } from '../../../objectTypes'
import { titleFromFileName, useFile } from '../../../redux/slices/workingDirectorySlice'
import { useContext } from 'react'
import { PanelContext } from './SimulatorPanel'
import { pollStatus, submitAnalysis } from '../../../ibiosim'
import { useRef } from 'react'


export default function AnalysisWizard() {

    // error boundary for weird bug
    const panelContext = useContext(PanelContext)
    if(!panelContext)
        return <></>

    const [panel, usePanelState] = panelContext
    const [running, setRunning] = usePanelState('running', false)
    const [activeTab, setActiveTab] = usePanelState('activeTab')
    // console.log(panel.state)

    // stepper states
    const numSteps = 3
    const [activeStep, setActiveStep] = usePanelState('activeStep', 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))

    // Step 1: select component
    const [componentId, setComponentId] = usePanelState('componentId')
    const [component] = useFile(componentId)
    const handleComponentChange = name => {
        setComponentId(name)
    }

    // Step 2: select parameter source
    const [parameterSource, setParameterSource] = usePanelState('parameterSource', null)
    const [environmentId, setEnvironmentId] = usePanelState('environmentId')
    const [environment] = useFile(environmentId)
    const handleEnvironmentChange = name => {
        setEnvironmentId(name)
    }

    // form state
    const [formValidated, setFormValidated] = useState()

    // determine if we can move to next step or not
    let showNextButton = false
    switch (activeStep) {
        case 0: showNextButton = !!componentId
            break
        case 1: showNextButton = !!environmentId || (parameterSource == 1 && formValidated)
            break
    }

    // submission & response tracking
    const [orchestrationUris, setOrchestrationUris] = usePanelState('orchestrationUris')
    const [results, setResults] = usePanelState('results')

    const orchestrationUrisRef = useRef(orchestrationUris)
    orchestrationUrisRef.current = orchestrationUris

    const pollingTimeout = () => setTimeout(async () => {

        console.debug("Polling analysis status...")
        const output = await pollStatus(orchestrationUrisRef.current)

        // if there's no output, run another poll
        if (!output) {
            pollingTimeout()
            return
        }

        setResults(output)
        setRunning(false)
        
        console.debug("Analysis complete.")
        showNotification({
            message: `${titleFromFileName(panel.fileHandle.name)} has finished running.`,
            color: "green"
        })
        setActiveTab(1)
    }, 5000)

    const handleAnalysisRun = async () => {
        setRunning(true)

        try {
            // start analysis
            const response = await submitAnalysis(
                component,
                parameterSource ?
                    { parameters: panel.state.form } :
                    { environment }
            )

            setOrchestrationUris(response)
            pollingTimeout()

            console.debug("Analysis accepted.")
        }
        catch (error) {
            setRunning(false)
            showNotification({
                message: "Encountered an error while running analysis.",
                color: "red"
            })
        }
    }

    const handleCancel = () => {
        setRunning(false)
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
                    <Tabs grow position='center' active={parameterSource} onTabChange={setParameterSource} >
                        <Tabs.Tab label="Select an environment archive">
                            <Dropzone
                                allowedTypes={["environment"]}
                                item={environment?.name}
                                onItemChange={handleEnvironmentChange}
                            >
                                Drag & drop an environment from the explorer
                            </Dropzone>
                        </Tabs.Tab>
                        <Tabs.Tab label="Manually enter parameters">
                            <AnalysisForm onValidation={setFormValidated} />
                        </Tabs.Tab>
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
