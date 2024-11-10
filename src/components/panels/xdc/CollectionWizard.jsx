import { Container, Stepper, Group, Button, Space, Text, Title } from "@mantine/core"
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

    // stepper states
    const numSteps = 4 
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))
    
    // Step 1: Experimental Metadata file
    const [experimentalId, setExperimentalId] = usePanelProperty(panelId, 'experimental', false)
    const experimentalFile = useFile(experimentalId)
    const handleExperimentalChange = name => {
        setExperimentalId(name)
    }

    const [XDCdataID, setXDCDataID] = usePanelProperty(panelId, 'XDCdataID', false)
    const xDCdataFile = useFile(XDCdataID)
    const handleExperimentalDataChange = name => {
        setXDCDataID(name)
    }
    
    // Step 2: Checks to see if a verified token has been selected
    const [verifiedToken, setVerifiedToken] = usePanelProperty(panelId, 'verifiedToken', false)

    //Step 3: Timeline status--indicates XDC server's status
    const [timelineStatus, setTimelineStatus] = usePanelProperty(panelId, "runtimeStatus", false, false, RuntimeStatus.COMPLETED);

    //Step 4:
    const [uploaderInfo, setUploadingInfo] = usePanelProperty(panelId, "uploadingInfo", false);

    //To be implemented
    //Will be replaced with a switch case to handle proper movement between steps
    let showNextButton = true
    
    //To hide items that are not yet implemented
    let TBI = false

    return (
        <Container style={stepperContainerStyle}>
            <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm">
                <Stepper.Step allowStepSelect={activeStep > 0 && activeStep != 3}
                    label="Upload Files"
                    description="Upload experimental data"
                    icon={<IoIosCloudUpload />}>
                    <Dropzone
                        allowedTypes={[ObjectTypes.Metadata.id]}
                        item={experimentalFile?.name}
                        onItemChange={handleExperimentalChange}>
                        Drag & drop Experimental Metadata from the explorer
                    </Dropzone>
                    <Space h='lg' />
                    <Dropzone
                        allowedTypes={[ObjectTypes.Output.id]}
                        item={xDCdataFile?.name}
                        onItemChange={handleExperimentalDataChange}>
                        Drag & drop Plate Reader Output from the explorer
                    </Dropzone>
                </Stepper.Step>


                <Stepper.Step
                    allowStepSelect={activeStep > 1 && activeStep != 3}
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
                    allowStepSelect={activeStep > 2 && activeStep != 3}
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
                    <Text size="xl">
                        The link to your experiment can be found at:
                        <br />
                        <a href={uploaderInfo?.instance}>{uploaderInfo?.instance}/aUniqueValue</a>
                    </Text>
                    <Text size="md">
                        This experiment was uploaded by, {uploaderInfo?.name} (Also known by their username as {uploaderInfo?.user})
                        The email on file is <a href={`mailto:${uploaderInfo?.email}`}>{uploaderInfo?.email}</a>
                    </Text>
                    <hr />
                    <Text size="md">
                        Files uploaded:
                        <br />
                        Metadata: {experimentalFile?.name}
                        <br />
                        Plate Reader Output: {xDCdataFile?.name}
                    </Text>
                    <hr />
                    <Text size="xs" ta="center" fs="italic">
                        * The "Experiments" file has been updated to include the link as well as relevant information as a reciept of your actions. To prevent losing this information further modifying this experiments file through SynBioSuite has been disabled and strongly discouraged.
                    </Text>
                </Stepper.Completed>
            </Stepper>

            <Group position="center" mt="xl">
                <Button
                    variant="default"
                    onClick={prevStep}
                    sx={{ display: activeStep === 0 || activeStep === 3 ? 'none' : 'block' }}
                >
                    Back
                </Button>
                {activeStep < 3 && experimentalId && XDCdataID && (activeStep !== 1 || verifiedToken) && (activeStep !== 2 || timelineStatus === RuntimeStatus.COMPLETED) ? (
                    <Button
                        onClick={nextStep}
                        sx={{ display: showNextButton ? 'block' : 'none' }}
                    >
                        Next step
                    </Button>
                ) : (
                    <></>
                )}
            </Group>
        </Container>
    )
}

const stepperContainerStyle = {
    marginTop: 40,
    padding: '0 40px',
    flexDirection: 'column'
}