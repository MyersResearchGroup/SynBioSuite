import { Container, Stepper, Group, Button, Space, Text, Avatar } from "@mantine/core"
import Dropzone from '../../Dropzone'
import { ObjectTypes } from '../../../objectTypes'
import { useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { useContext } from 'react'
import { PanelContext } from './CollectionPanel'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import XDCTimeline from './XDCTimeline'
import { IoIosCloudUpload } from "react-icons/io";
import { TbStatusChange } from "react-icons/tb";
import { RuntimeStatus } from "../../../runtimeStatus"
import { useDispatch } from "react-redux"
import { openSBH, openFJ } from "../../../redux/slices/modalSlice"
import { useLocalStorage } from "@mantine/hooks"



export default function CollectionWizard() {
    const panelId = useContext(PanelContext)
    const dispatch = useDispatch()

    const [dataSBH, setDataSBH] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [selectedSBH, setSelectedSBH] = useLocalStorage({ key: `SynbioHub-Primary`, defaultValue: "" });
    const [dataFJ, setDataFJ] = useLocalStorage({ key: "Flapjack", defaultValue: [] });
    const [selectedFJ, setSelectedFJ] = useLocalStorage({ key: `Flapjack-Primary`, defaultValue: "" });

    const findInstance = (instance, repo) => {
        if (repo == "SBH")
            return dataSBH.find((element) => element.value === instance);
        else if (repo == "FJ")
            return dataFJ.find((element) => element.value === instance);
    }

    // file info
    const fileHandle = usePanelProperty(panelId, "fileHandle")
    
    // stepper states
    const numSteps = 4 
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))
    
    // Step 1: Experimental Metadata file
    const [metadataID, setMetadataID] = usePanelProperty(panelId, 'metadata', false)
    const metadataFile = useFile(metadataID)
    
    const handleMetadataChange = name => {
        setMetadataID(name)
    }

    // Step 1: Experimental Results file
    const [resultsID, setResultsID] = usePanelProperty(panelId, 'results', false)
    const resultsFile = useFile(resultsID)
    
    const handleExperimentalDataChange = name => {
        setResultsID(name)
    }
    
    //Step 2: Timeline status--indicates XDC server's status
    const [timelineStatus, setTimelineStatus] = usePanelProperty(panelId, "runtimeStatus", false, RuntimeStatus.WAITING);

    const getFileNameWithoutExtension = (fileName) => fileName.replace(/\.[^/.]+$/, "");

    return (
        <Container style={stepperContainerStyle}>
            <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm">
                <Stepper.Step allowStepSelect={activeStep > 0 && activeStep != 2}
                    label="Upload Files"
                    description="Upload experimental data"
                    icon={<IoIosCloudUpload />}>
                    <Dropzone
                        allowedTypes={[ObjectTypes.Metadata.id]}
                        item={metadataFile?.name}
                        onItemChange={handleMetadataChange}>
                        Drag & drop Experimental Metadata from the explorer
                    </Dropzone>
                    <Space h='lg' />
                    <Dropzone
                        allowedTypes={[ObjectTypes.Results.id]}
                        item={resultsFile?.name}
                        onItemChange={handleExperimentalDataChange}>
                        Drag & drop Experimental Results from the explorer
                    </Dropzone>
                </Stepper.Step>

                <Stepper.Step
                    allowStepSelect={activeStep > 1 && activeStep != 2}
                    label="Uploader Info"
                    description="Upload your experiment here"
                    icon={<TbStatusChange />}
                >
                    <Group grow style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Group grow style={{ flexDirection: 'row', alignItems: 'flex-start' }} >
                            <XDCTimeline />
                            <Group grow style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                <Group grow onClick={() => dispatch(openSBH())} style={{ alignItems: 'center', width: '100%' }}>
                                    <Avatar
                                        src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-2.png"
                                        size={60}
                                        radius="md"
                                        style={{
                                            opacity: selectedSBH ? 1 : 0.5,
                                            transition: 'opacity 0.1s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                        onMouseLeave={(e) => e.currentTarget.style.opacity = selectedSBH ? '1' : '0.5'}
                                    />
                                    <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'visible' }}>
                                        <Text fz="md" fw={500}>
                                            {selectedSBH ? findInstance(selectedSBH, "SBH").username : "Not Logged In"}
                                        </Text>
                                        <Text fz="xs" fw={700} c="dimmed">
                                            {selectedSBH ? findInstance(selectedSBH, "SBH").instance : "Not Logged In"}
                                        </Text>
                                    </div>
                                </Group>
                                <Group grow onClick={() => dispatch(openFJ())} style={{ alignItems: 'center', width: '100%' }}>
                                    <Avatar
                                        src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-2.png"
                                        size={60}
                                        radius="md"
                                        style={{
                                            opacity: selectedFJ ? 1 : 0.5,
                                            transition: 'opacity 0.1s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                        onMouseLeave={(e) => e.currentTarget.style.opacity = selectedFJ ? '1' : '0.5'}
                                    />
                                    <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'visible' }}>
                                        <Text fz="md" fw={500}>
                                            {selectedFJ ? findInstance(selectedFJ, "FJ").username : "Not Logged In"}
                                        </Text>
                                        <Text fz="xs" fw={700} c="dimmed">
                                            {selectedFJ ? findInstance(selectedFJ, "FJ").instance : "Not Logged In"}
                                        </Text>
                                    </div>
                                </Group>
                            </Group>
                        </Group>
                    </Group>
                </Stepper.Step>

                <Stepper.Completed>
                    {false ? <><Text size="xl">
                        The link to your SynBioHub collection can be found at:
                        <br />
                        <a href={`${SBHUploaderInfo?.instance}/user/${SBHUploaderInfo?.user}/${getFileNameWithoutExtension(fileHandle.name)}/${getFileNameWithoutExtension(fileHandle.name)}_collection/1`} style={{ textDecoration: 'none' }}>
                            {`${SBHUploaderInfo?.instance}/user/${SBHUploaderInfo?.user}/${getFileNameWithoutExtension(fileHandle.name)}/${getFileNameWithoutExtension(fileHandle.name)}_collection/1`}
                        </a>
                    </Text>
                    <Text size="md">
                        This experiment was uploaded to SynBioHub by the user, {SBHUploaderInfo?.name} (Also known by their username as {SBHUploaderInfo?.user})
                        The known email is <a href={`mailto:${SBHUploaderInfo?.email}`} style={{ textDecoration: 'none' }}>{SBHUploaderInfo?.email}</a>
                    </Text>
                    <hr />
                    <Text size="xl">
                        The link to your Flapjack collection can be found at:
                        <br />
                        <a href={`https://flapjack.insert-your-domain-here.org/${getFileNameWithoutExtension(fileHandle.name)}/1`} style={{ textDecoration: 'none' }}>
                        {`https://flapjack.insert-your-domain-here.org/${getFileNameWithoutExtension(fileHandle.name)}/1`}
                        </a>
                    </Text>
                    <Text size="md">
                        This experiment was uploaded to Flapjack by the user, {FJUploaderInfo?.name} (Also known by their username as {FJUploaderInfo?.user})
                        The known email is <a href={`mailto:${FJUploaderInfo?.email}`} style={{ textDecoration: 'none' }}>{FJUploaderInfo?.email}</a>
                    </Text></> : <></>}
                    <hr />
                    <Text size="md">
                        Files uploaded:
                        <br />
                        Metadata: {metadataFile?.name}
                        <br />
                        {resultsFile?.name ?
                            <>Plate Reader Output: {resultsFile?.name}</>
                        :
                            <></>
                        }
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
                    sx={{ display: activeStep === 0 || activeStep === 2 ? 'none' : 'block' }}
                >
                    Back
                </Button>
                {activeStep == 1 && timelineStatus == RuntimeStatus.WAITING ? (
                    <>
                        <Button
                            onClick={() => {
                                setTimelineStatus(RuntimeStatus.PROCESSING);
                                setTimeout(() => {
                                    setTimelineStatus(RuntimeStatus.UPLOADING);
                                    setTimeout(() => {
                                        setTimelineStatus(RuntimeStatus.COMPLETED);
                                        setTimeout(() => nextStep(), 1000);
                                    }, 1000);
                                }, 1000);
                            }}
                            disabled={!selectedSBH}
                            sx={{ display: 'block', opacity: selectedSBH ? 1 : 0.5 }}
                        >
                            Upload to Synbiohub
                        </Button>
                        <Button
                            onClick={() => {
                                setTimelineStatus(RuntimeStatus.PROCESSING);
                                setTimeout(() => {
                                    setTimelineStatus(RuntimeStatus.UPLOADING);
                                    setTimeout(() => {
                                        setTimelineStatus(RuntimeStatus.COMPLETED);
                                        setTimeout(() => nextStep(), 1000);
                                    }, 1000);
                                }, 1000);
                            }}
                            disabled={!selectedFJ}
                            sx={{ display: 'block', opacity: selectedFJ ? 1 : 0.5 }}
                        >
                            Upload to Flapjack
                        </Button>
                        <Button
                            onClick={() => {
                                setTimelineStatus(RuntimeStatus.PROCESSING);
                                setTimeout(() => {
                                    setTimelineStatus(RuntimeStatus.UPLOADING);
                                    setTimeout(() => {
                                        setTimelineStatus(RuntimeStatus.COMPLETED);
                                        setTimeout(() => nextStep(), 1000);
                                    }, 1000);
                                }, 1000);
                            }}
                            disabled={!selectedSBH || !selectedFJ}
                            sx={{ display: 'block', opacity: selectedSBH && selectedFJ ? 1 : 0.5 }}
                        >
                            Upload to both Synbiohub and Flapjack
                        </Button>
                    </>
                ) : (
                    <></>
                )}
                {activeStep == 0 && metadataID ? (
                    <Button
                        onClick={nextStep}
                        sx={{ display: 'block' }}
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