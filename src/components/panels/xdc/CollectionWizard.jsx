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
import { openSBH, openFJ, openIframes, closeIframes } from "../../../redux/slices/modalSlice"
import { useLocalStorage } from "@mantine/hooks"
import ExperimentalTable from "./ExperimentalTable"
//import { useState } from "react"
import { MdTextSnippet } from "react-icons/md"
import { TextInput, Textarea } from "@mantine/core"
import { upload_sbs } from "../../../API"
import * as XLSX from 'xlsx'
import { useState } from "react"
import { getObjectType } from '../../../objectTypes'
import { useEffect } from "react"

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

    const [experimentalId] = usePanelProperty(panelId, 'metadata', false)
    const experimentalFile = useFile(experimentalId)
    const experimentalFileObjectType = getObjectType(experimentalFile?.objectType)

    const [libraryName, setLibraryName] = useState(null)
    const [description, setDescription] = useState(null)
    const [pendingNextStep, setPendingNextStep] = useState(false)

    const [collectionName, setCollectionName] = usePanelProperty(panelId, 'collectionName', false)
    const [collectionDescription, setCollectionDescription] = usePanelProperty(panelId, 'collectionDescription', false)
    
    //excel information
    const readExcelFile = (eFile) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsArrayBuffer(eFile)
            reader.onload= (event) => {resolve(event.target.result)}
            reader.onerror = (error) =>{reject(error)}
        })
    }

    const getDescriptionandLibraryName = async () => {
        const realFile = experimentalFile.getFile()
        const arrayBuffer = await readExcelFile(realFile)
        const workbook = XLSX.read(arrayBuffer, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

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

        if (temp_libraryName) setLibraryName(temp_libraryName)
        if (temp_description) setDescription(temp_description)
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
    }, [libraryName, description, pendingNextStep])

    //loads in previous information
    useEffect(() => {
        if (collectionName && !libraryName) setLibraryName(collectionName);
        if (collectionDescription && !description) setDescription(collectionDescription);
    }, [collectionName, collectionDescription])


    // file info
    const fileHandle = usePanelProperty(panelId, "fileHandle")
    
    // stepper states
    const numSteps = 3
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const nextStepV2 = () => {
        setActiveStep((current) => (current < numSteps ? current + 1 : current));
        dispatch(openIframes());
    }
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
                <Stepper.Step allowStepSelect={activeStep > 1 && activeStep != numSteps}
                    label="Collection Info"
                    description="Upload Collection Information"
                    icon={<MdTextSnippet />}>
                    <div style={{ width: '100%' }}>
                        <Text fw={500}>Collection Name</Text>
                        <Space h="xs" />
                        <TextInput
                            onChange={(e) => {
                                setLibraryName(e.target.value)
                                setCollectionName(e.target.value)
                            }}
                            defaultValue = {libraryName}
                            radius="md"
                            size="md"
                            style={{ width: '100%' }}
                        />
                        
                        <Text fw={500} mt="md">Collection Description</Text>
                        <Space h="xs" />
                        <Textarea
                            onChange={(e) => {
                                setDescription(e.target.value)
                                setCollectionDescription(e.target.value)
                            }}
                            defaultValue = {description}
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
                            <ExperimentalTable newCollectionname = {libraryName} newDescriptionName = {description}/>
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
                                    sbh_collec: libraryName,
                                    sbh_collec_desc: description,
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
                {(activeStep == 0 && metadataID) ? (
                    <Button
                        onClick={handleClick}
                        sx={{ display: 'block' }}
                    >
                        Next step
                    </Button>
                ) 
                : (activeStep == 1)? (
                    <Button
                        onClick={nextStepV2}
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