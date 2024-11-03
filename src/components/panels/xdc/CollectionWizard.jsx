import { Container, Stepper, Group, Button, Space, Text } from "@mantine/core"
import Dropzone from '../../Dropzone'
import CenteredTitle from '../../CenteredTitle'
import { ObjectTypes } from '../../../objectTypes'
import { titleFromFileName, useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { useContext } from 'react'
import { PanelContext } from './CollectionPanel'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import LoginForm from './SynBioHubLogIn'
import ExperimentalTable from './ExperimentalTable'
import XDCTimeline from './XDCTimeline'
import { IoIosCloudUpload } from "react-icons/io";
import { FaGear } from "react-icons/fa6";
import { TbStatusChange } from "react-icons/tb";
import Cookies from 'js-cookie';
import SBHandFJLogIn from "./SBHandFJLogIn"
import { RuntimeStatus } from "../../../runtimeStatus"




export default function CollectionWizard() {
    const panelId = useContext(PanelContext)

    // file info
    const fileHandle = usePanelProperty(panelId, "fileHandle")
    const panelTitle = titleFromFileName(fileHandle.name)

    // Log-in status and XDC API states
    const [SBHloginSuccess, setSBHLoginSuuccess] = usePanelProperty(panelId, "SBHloginStatus", false, false, false);
    const [timelineStatus, setTimelineStatus] = usePanelProperty(panelId, "runtimeStatus", false, false, RuntimeStatus.COMPLETED);

    // form state
    const formValues = usePanelProperty(panelId, "formValues")

    // stepper states
    const numSteps = 4 
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))
    
    //Example Cookie Handler -- Placeholder for code required to handle login
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
    
    // Step 1: Experimental Metadata file
    const [experimentalId, setExperimentalId] = usePanelProperty(panelId, 'experimental', false)
    const experimentalFile = useFile(experimentalId)
    const handleExperimentalChange = name => {
        setExperimentalId(name)
    }

    // Step 2: Plate Reader Output experimental file
    const [XDdataID, setXDDataID] = usePanelProperty(panelId, 'XDdataID', false)
    const xDdataFile = useFile(XDdataID)
    const handleExperimentalDataChange = name => {
        setXDDataID(name)
    }
    
    //To be implemented
    //Will be replaced with a switch case to handle proper movement between steps
    let showNextButton = true
    
    //To hide items that are not yet implemented
    let TBI = false

    return (
        <Container style={stepperContainerStyle}>
            <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm">
                <Stepper.Step allowStepSelect={activeStep > 0}
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
                        <SBHandFJLogIn/>
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
                        {TBI ? <ExperimentalTable /> : <></>}
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
                <Button
                    variant="default"
                    onClick={prevStep}
                    sx={{ display: activeStep == 0 ? 'none' : 'block' }}
                >
                    Back
                </Button>
                {activeStep < 3 && (experimentalId) && (XDdataID) && (activeStep !=1 || SBHloginSuccess) && (activeStep != 2 || timelineStatus == RuntimeStatus.COMPLETED)?
                    <Button
                        onClick={nextStep}
                        sx={{ display: showNextButton ? 'block' : 'none' }}
                    >
                        Next step
                    </Button>

                    //Cancel button placeholder -- to be implemented with timeline

                    /*: false?
                    <Button
                        type="submit"
                        // gradient={{ from: "canvasBlue", to: "indigo" }}
                        gradient={{ from: "red", to: "red" }}
                        variant="gradient"
                        radius="xl"
                        onClick={null}
                    >
                        Cancel
                    </Button> */:
                    <></>
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