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
import ExperimentalTable from './ExperimentalTable'
import XDCTimeline from './XDCTimeline'
import { IoIosCloudUpload } from "react-icons/io";
import { FaGear } from "react-icons/fa6";
import { TbStatusChange } from "react-icons/tb";
import Cookies from 'js-cookie';




export default function CollectionWizard() {
    const panelId = useContext(PanelContext)
    const dispatch = useDispatch()

    // file info
    const fileHandle = usePanelProperty(panelId, "fileHandle")
    const panelTitle = titleFromFileName(fileHandle.name)

    const [status, setStatus] = usePanelProperty(panelId, "runtimeStatus", false)
    const running = RuntimeStatus.running(status)
    const [, setRequestedAt] = usePanelProperty(panelId, "lastRequestedAt", false)

    // Log-in status and XDC API states
    const [loginSuccess, setLoginSuucces] = usePanelProperty(panelId, "loginStatus", false, false);
    setLoginSuucces(true)
    console.log(loginSuccess)
    setStatus(RuntimeStatus.COMPLETED)

    // form state
    const formValues = usePanelProperty(panelId, "formValues")
    const [formValidated, setFormValidated] = useState()

    // stepper states
    const numSteps = 4 
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => {setActiveStep((current) => (current < numSteps ? current + 1 : current))}
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))
    /*
    const attemptLogin = () => {
        if(Cookies.get('SBH_Login')) {
            setLoginSuucces(true)
            showNotification({
                title: 'Login Successful',
                message: `You have successfully logged in to ${JSON.parse(Cookies.get('SBH_Login'))[0].instance}`,
                color: 'green',
                icon: CgCheckO
            })
            // Create a cookie with default values if it doesn't exist
            const AuthToken = "NOT IMPLEMENTED YET";
            const login = [{instance:formValues?.instance,username:formValues?.username,loginStatus:false}];
            Cookies.set('AuthToken', AuthToken);
            Cookies.set('SBH_Login', JSON.stringify(login));
            console.log('Created new SBH_Login cookie with default values');
            nextStep()
        } else {
            setLoginSuucces(false)
            showNotification({
                title: 'Login Failed',
                message: 'Please check your credentials and try again',
                color: 'red',
                icon: CgCheckO
            })
        }
    }*/
    
    // Step 1: select experimental file
    const [experimentalId, setExperimentalId] = usePanelProperty(panelId, 'experimental', false)
    const experimentalFile = useFile(experimentalId)
    const handleExperimentalChange = name => {
        setExperimentalId(name)
    }

    // Step 2: select experimental file
    const [XDdataID, setXDDataID] = usePanelProperty(panelId, 'XDdataID', false)
    const xDdataFile = useFile(XDdataID)
    const handleExperimentalDataChange = name => {
        setXDDataID(name)
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

    return (
        <Container style={stepperContainerStyle}>
            <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm">
                <Stepper.Step allowStepSelect={activeStep > 0 && !running}
                    label="Upload Files"
                    description="Upload experimental data"
                    icon={<IoIosCloudUpload />}>
                    <Dropzone
                        allowedTypes={[ObjectTypes.XDC.id]}
                        item={experimentalFile?.name}
                        onItemChange={handleExperimentalChange}>
                        Drag & drop Experimental Metadata from the explorer
                    </Dropzone>
                    <Space h='lg' />
                    <Dropzone
                        allowedTypes={[ObjectTypes.Output.id]}
                        item={xDdataFile?.name}
                        onItemChange={handleExperimentalDataChange}>
                        Drag & drop Plate Reader Output from the explorer
                    </Dropzone>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 2}
                    label="Log-In"
                    description="For both SynBioHub and Flapjack"
                    icon={<FaGear />}
                >
                    <Space h='lg' />
                    <Group grow style={{ alignItems: 'flex-start' }}>
                        <LoginForm onValidation={validation => setFormValidated(!validation.hasErrors)}/>
                    </Group>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 3}
                    label="Upload Status"
                    description="See your experiment uploaded"
                    icon={<TbStatusChange />}
                >
                    <Space h='lg' />
                    <Group grow style={{ alignItems: 'flex-start' }}>
                        <ExperimentalTable />
                        <XDCTimeline />
                    </Group>
                </Stepper.Step>
                <Stepper.Completed>
                    <CenteredTitle height={150}>The link to your experiment can be found at:
                        <br/><a href="#">{formValues?.instance}/aUniqueValue</a>
                    </CenteredTitle>
                    <hr/>
                    <Text size="xs" ta="center" fs="italic">* The metadata file has been updated to include the link. If you upload this file to another SynBioHub instance, the link in the file will be updated accordingly. The link above will remain functional and accessible on your SynBioHub instance.</Text>
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
                {formValidated  && activeStep == 1 && (
                            <Button
                                onClick={attemptLogin}//handleLogin(formValues.instance,formValues.username,formValues.password)}
                                variant="gradient"
                                gradient={{ from: "green", to: "green" }}
                            >
                                Attempt Login
                            </Button>
                        )}
                {activeStep < 3 && activeStep != 1 && (experimentalId) && (XDdataID)?
                    <Button
                        onClick={nextStep}
                        sx={{ display: showNextButton ? 'block' : 'none' }}
                    >
                        Next step
                    </Button> : activeStep != 1 && activeStep < 3 && (experimentalId) && (XDdataID)?
                    <Button
                        type="submit"
                        // gradient={{ from: "canvasBlue", to: "indigo" }}
                        gradient={{ from: "red", to: "red" }}
                        variant="gradient"
                        radius="xl"
                        onClick={null}
                    >
                        Cancel
                    </Button> :
                    <></>
                    }               
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