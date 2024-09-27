import { useEffect, useState } from 'react'
import { Container, Stepper, Group, Button, Tabs, Space, Title, Text, Center, SimpleGrid, Box, Divider, Badge } from "@mantine/core"
import Dropzone from '../../Dropzone'
import CenteredTitle from '../../CenteredTitle'
import { showNotification } from '@mantine/notifications'
import { TbComponents } from 'react-icons/tb'
import { IoAnalyticsSharp } from 'react-icons/io5'
import { BiWorld } from "react-icons/bi"
import { ObjectTypes } from '../../../objectTypes'
import { titleFromFileName, useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { useContext } from 'react'
import { pollStatus, submitAnalysis, terminateAnalysis } from '../../../ibiosim'
import { useRef } from 'react'
import { PanelContext } from './CollectionPanel'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { useTimeout } from '@mantine/hooks'
import { RuntimeStatus } from '../../../runtimeStatus'
import { CgCheckO } from "react-icons/cg"
import { useDispatch } from 'react-redux'
import { setfailureMessage } from '../../../redux/slices/failureMessageSlice'
import { activitiesSlice } from '../../../redux/slices/activitySlice'
import LoginForm from './SynBioHubLogIn'
import { parameterMap } from './SynBioHubLogIn'
import handleLogin from './XDC_API'

export default function CollectionWizard() {
    const panelId = useContext(PanelContext)
    const dispatch = useDispatch()

    // file info
    const fileHandle = usePanelProperty(panelId, "fileHandle")
    const panelTitle = titleFromFileName(fileHandle.name)

    const [status, setStatus] = usePanelProperty(panelId, "runtimeStatus", false)
    const running = RuntimeStatus.running(status)
    const [, setRequestedAt] = usePanelProperty(panelId, "lastRequestedAt", false)

    // stepper states
    const numSteps = 4 
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => {setActiveStep((current) => (current < numSteps ? current + 1 : current))}
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))
    
    // Step 1: select experimental file
    const [experimentalId, setExperimentalId] = usePanelProperty(panelId, 'experimental', false)
    const experimentalFile = useFile(experimentalId)
    const handleExperimentalChange = name => {
        setExperimentalId(name)
    }

    //Modify for second file
    
    // Step 2: select parameter source
    //const [parameterSource, setParameterSource] = usePanelProperty(panelId, 'parameterSource', false, TabValues.ENVIRONMENT)
    //const [environmentId, setEnvironmentId] = usePanelProperty(panelId, 'environment', false)
    //const environment = useFile(environmentId)
    //const handleEnvironmentChange = name => {
    //    setEnvironmentId(name)
    //}

    // determine if we can move to next step or not
    //Commented out for rushing GUI purposes
    let showNextButton = true
    /*switch (activeStep) {
        case 0: showNextButton = !!componentId
        break
        case 1: showNextButton =
        (parameterSource == TabValues.ENVIRONMENT && !!environmentId) ||
        (parameterSource == TabValues.PARAMETERS && formValidated) ||
        parameterSource == TabValues.INPUT
        break
    }*/

    // form state
    const formValues = usePanelProperty(panelId, "formValues")
    const [formValidated, setFormValidated] = useState()

    //XDC API states
    const loginSuccess = usePanelProperty(panelId, "status", false, false);

    return (
        <Container style={stepperContainerStyle}>
            <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm">
                <Stepper.Step allowStepSelect={activeStep > 0 && !running}
                    label="Select input file"
                    description="List of Experiments File"
                    icon={<TbComponents />}>
                    <Dropzone
                        allowedTypes={[ObjectTypes.XDC.id]}
                        item={experimentalFile?.name}
                        onItemChange={handleExperimentalChange}>
                        Drag & drop an experiment from the explorer
                    </Dropzone>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 1}
                    label="Log-In: SynBio Hub"
                    description="Choose your SynBio Hub Instance"
                    icon={<BiWorld />}
                >
                    <Space h='lg' />
                    <Group grow style={{ alignItems: 'flex-start' }}>
                        <LoginForm onValidation={validation => setFormValidated(!validation.hasErrors)}/>
                    </Group>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 2}
                    label="Upload Plate Reader Output"
                    description="Use a _____ file"
                    icon={<BiWorld />}
                >
                    <Space h='lg' />
                    <Dropzone
                        allowedTypes={[ObjectTypes.XDC.id]}
                        item={experimentalFile?.name}
                        onItemChange={handleExperimentalChange}>
                        Note: Change variables for files before continuing<br />Drag & drop an experiment from the explorer
                    </Dropzone>
                </Stepper.Step>
                <Stepper.Completed>
                    <CenteredTitle height={150}>Uploading is in progress... </CenteredTitle>
                </Stepper.Completed>
            </Stepper>
            <Group position="center" mt="xl">
                {running ?<></>:
                <>
                <Button
                    variant="default"
                    onClick={prevStep}
                    sx={{ display: activeStep == 0 ? 'none' : 'block' }}
                >
                    Back
                </Button>
                {formValidated && activeStep == 1 && (
                            <Button
                                onClick={() => handleLogin(formValues.instance,formValues.username,formValues.password)}
                                variant="gradient"
                                gradient={{ from: "green", to: "green" }}
                            >
                                Sign In
                            </Button>
                        )}
                {activeStep < 5 ?
                    <Button
                        onClick={nextStep}
                        sx={{ display: showNextButton ? 'block' : 'none' }}
                    >
                        Next step
                    </Button> :
                    <Button
                        type="submit"
                        // gradient={{ from: "canvasBlue", to: "indigo" }}
                        gradient={{ from: "red", to: "red" }}
                        variant="gradient"
                        radius="xl"
                        onClick={null}
                    >
                        Cancel
                    </Button>}               
                </>
                }
            </Group>
        </Container>
    )
}

const stepperContainerStyle = {
    marginTop: 40,
    padding: '0 40px',
    flexDirection: 'column'
}