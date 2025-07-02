import { Container, Stepper, Group, Button, Space, Text, Avatar } from "@mantine/core"
import Dropzone from '../../Dropzone'
import { ObjectTypes } from '../../../objectTypes'
import { useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { useContext } from 'react'
import { PanelContext } from './CollectionPanel'
import { usePanel, usePanelProperty } from '../../../redux/hooks/panelsHooks'
import XDCTimeline from './XDCTimeline'
import { IoIosCloudUpload } from "react-icons/io";
import { TbStatusChange } from "react-icons/tb";
import { RuntimeStatus } from "../../../runtimeStatus"
import { useDispatch } from "react-redux"
import { openSBH, openFJ } from "../../../redux/slices/modalSlice"
import { useLocalStorage } from "@mantine/hooks"
import ExperimentalTable from "./ExperimentalTable"
//import { useState } from "react"
import { MdTextSnippet } from "react-icons/md"
import { TextInput, Textarea } from "@mantine/core"
import { upload_sbs } from "../../../API"
import { read, utils } from 'xlsx'
import { useState } from "react"
import { getObjectType } from '../../../objectTypes'
import { useEffect } from "react"
import { useOpenPanel } from '../../../redux/hooks/panelsHooks'

export default function CollectionWizard() {
    const panelId = useContext(PanelContext)
    const dispatch = useDispatch()
    const openPanel = useOpenPanel()
    const handleOpenFile = (file) => {
        openPanel(file)
    }

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

    const [experimentalId] = usePanelProperty(panelId, 'metadata', false)
    const experimentalFile = useFile(experimentalId)
    const experimentalFileObjectType = getObjectType(experimentalFile?.objectType)

    const [pendingNextStep, setPendingNextStep] = useState(false)

    const [collectionName, setCollectionName] = usePanelProperty(panelId, 'collectionName', false)
    const [collectionDescription, setCollectionDescription] = usePanelProperty(panelId, 'collectionDescription', false)

    const getDescriptionandLibraryName = async () => {
        const realFile = await experimentalFile.getFile()
        const arrayBuffer = await realFile.arrayBuffer()
        const wb = read(arrayBuffer, { type: "array" })
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rows = utils.sheet_to_json(ws, { raw: false, header: 1, blankrows: true, defval: null });

        let temp_libraryName = null
        let temp_description = null

        for (const row of rows) {
            for (let i = 0; i < row.length; i++) {
                if (row[i] && typeof row[i] === "string") {
                    const cell = row[i].toLowerCase()
                    if (cell.includes("library name") || cell.includes("collection name")) {
                        temp_libraryName = row[i+1]
                    }
                    if (cell.includes("description")) {
                        temp_description = row[i+1]
                    }
                }
            }
        }

        if (temp_libraryName) setCollectionName(temp_libraryName)
        if (temp_description) setCollectionDescription(temp_description)
    }

    const refreshCollectionInfo = () => {
        getDescriptionandLibraryName()
    }

    function handleClick (){
        getDescriptionandLibraryName()
        setPendingNextStep(true)
    }
    
    //make sure next step is called when libraryName and description are set properly
    useEffect(() => {
        if (pendingNextStep) {
            setPendingNextStep(false)
            nextStep()
        }
    }, [collectionName, collectionDescription, pendingNextStep])


    // file info
    const fileHandle = usePanelProperty(panelId, "fileHandle")
    
    // stepper states
    const numSteps = 3
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))
    
    // Step 1: Experimental Metadata file
    const [metadataID, setMetadataID] = usePanelProperty(panelId, 'metadata', false)
    
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

    const metadataFile = useFile(metadataID)

    
    return (
        <Container style={stepperContainerStyle}>
            <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm">
                <Stepper.Step allowStepSelect={activeStep > 0 && activeStep != numSteps}
                    label="Upload Files"
                    description="Upload experimental data"
                    icon={<IoIosCloudUpload />}>
                    <Dropzone
                        allowedTypes={[ObjectTypes.Metadata.id]}
                        item={metadataFile?.name}
                        onItemChange={handleMetadataChange}
                        link={() => handleOpenFile(metadataFile)}
                        refresh={() => refreshCollectionInfo()}>
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
                <Stepper.Step allowStepSelect={activeStep > 1 && activeStep != numSteps}
                    label="Collection Info"
                    description="Upload Collection Information"
                    icon={<MdTextSnippet />}>
                    <div style={{ width: '100%' }}>
                        <Text fw={500}>Collection Name</Text>
                        <Space h="xs" />
                        <TextInput
                            onChange={(e) => {
                                setCollectionName(e.target.value)
                            }}
                            value={collectionName}
                            radius="md"
                            size="md"
                            style={{ width: '100%' }}
                        />
                        
                        <Text fw={500} mt="md">Collection Description</Text>
                        <Space h="xs" />
                        <Textarea
                            onChange={(e) => {
                                setCollectionDescription(e.target.value)
                            }}
                            value={collectionDescription}
                            minRows={4}
                            radius="md"
                            size="md"
                            style={{ width: '100%' }}
                        />
                    </div>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 2 && activeStep != numSteps}
                    label="Uploader Info"
                    description="Upload your experiment here"
                    icon={<TbStatusChange />}
                >
                    <Group grow style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Group grow style={{ flexDirection: 'row', alignItems: 'flex-start' }} >
                            <ExperimentalTable newCollectionname = {collectionName} newDescriptionName = {collectionDescription}/>
                            { selectedSBH && selectedFJ ? <XDCTimeline /> : 
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
                            </Group>}
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
                    </Text>a
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
                    sx={{ display: activeStep != 0 /*&& activeStep < numSteps*/ ? 'block' : 'none' }}
                >
                    Back
                </Button>
                {activeStep == numSteps - 1 /*&& timelineStatus == RuntimeStatus.WAITING*/ ? (
                    <>
                        <Button
                            onClick={() => {
                                upload_sbs(metadataFile, {
                                    fj_url: "",
                                    fj_user: "",
                                    fj_pass: "",
                                    sbh_url: import.meta.env.VITE_SYNBIOHUB_URL,
                                    sbh_user: import.meta.env.VITE_SYNBIOHUB_USERNAME,
                                    sbh_pass: import.meta.env.VITE_SYNBIOHUB_PASSWORD,
                                    sbh_collec: collectionName,
                                    sbh_collec_desc: collectionDescription,
                                    fj_overwrite: false,
                                    sbh_overwrite: false
                                })
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
                {(activeStep <= 1)? (
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