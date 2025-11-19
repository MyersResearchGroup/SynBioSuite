import { Container, Stepper, Group, Button, Space, Menu } from "@mantine/core"
import Dropzone from '../../Dropzone'
import { ObjectTypes } from '../../../objectTypes'
import { useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { useContext, useState } from 'react'
import { PanelContext } from './CollectionPanel'
import { usePanelProperty, useOpenPanel } from '../../../redux/hooks/panelsHooks'
import XDCTimeline from './XDCTimeline'
import { IoIosCloudUpload } from "react-icons/io";
import { TbStatusChange } from "react-icons/tb";
import { RuntimeStatus } from "../../../runtimeStatus"
import { useLocalStorage } from "@mantine/hooks"
import ExperimentalTable from "./ExperimentalTable"
import { MdTextSnippet } from "react-icons/md"
import CollectionInfo from "./CollectionInfo"
import { useDispatch } from "react-redux"
import { useUnifiedModal } from "../../../redux/hooks/useUnifiedModal"

export default function CollectionWizard() {
    const panelId = useContext(PanelContext)
    const openPanel = useOpenPanel()
    const dispatch = useDispatch();
    const { workflows } = useUnifiedModal();
    
    const handleOpenFile = (file) => {
        openPanel(file)
    }

    const [selectedSBH, setSelectedSBH] = useLocalStorage({ key: `SynbioHub-Primary`, defaultValue: "" });
    const [selectedFJ, setSelectedFJ] = useLocalStorage({ key: `Flapjack-Primary`, defaultValue: "" });
    
    // stepper states
    const numSteps = 3
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps - 1 ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))
    
    // Step 1: Experimental Metadata, Results, and Plate Reader file
    const [metadataID, setMetadataID] = usePanelProperty(panelId, 'metadata', false)
    const metadataFile = useFile(metadataID)
    
    const [resultsID, setResultsID] = usePanelProperty(panelId, 'results', false)
    const resultsFile = useFile(resultsID)

    const [plateOutputID, setPlateOutputID] = usePanelProperty(panelId, 'plateOutput', false)
    const plateOutputFile = useFile(plateOutputID)
    
    const handleMetadataChange = name => {
        setMetadataID(name)
    }
    
    const handleExperimentalDataChange = name => {
        setResultsID(name)
    }
    
    const handlePlateReaderChange = name => {
        setPlateOutputID(name)
    }

    // Step 2: Just to read values to know when to go to next step
    const [collection, setCollection] = usePanelProperty(panelId, 'collection', false, {})

    //Step 3: Timeline status--indicates XDC server's status
    const [timelineStatus, setTimelineStatus] = useState(RuntimeStatus.WAITING);

    const handleUploadSequence = () => {
        setTimelineStatus(RuntimeStatus.PROCESSING);
        setTimeout(() => {
            setTimelineStatus(RuntimeStatus.UPLOADING);
            setTimeout(() => {
                setTimelineStatus(RuntimeStatus.COMPLETED);
            }, 1000);
        }, 1000);
    };

    const uploadToFlapjack = sbh => {
        if (!selectedFJ || selectedFJ == ''){
            workflows.addRepository('fj', () => handleUploadSequence());
        } else {
            handleUploadSequence();
        }
    }
    
    return (
        <Container style={stepperContainerStyle}>
            <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm">
                <Stepper.Step allowStepSelect={activeStep > 0}
                    label="Upload Files"
                    description="Upload Experimental Data"
                    icon={<MdTextSnippet />}>
                    <Dropzone
                        allowedTypes={[ObjectTypes.Parts.id, ObjectTypes.Chassis.id, ObjectTypes.Chemicals.id, ObjectTypes.Medias.id, ObjectTypes.SampleDesigns.id, ObjectTypes.Metadata.id, ObjectTypes.Strains.id]}
                        item={metadataFile?.name}
                        onItemChange={handleMetadataChange}
                        link={() => handleOpenFile(metadataFile)}>
                        Drag & drop Experimental Metadata from the explorer
                    </Dropzone>
                    <Space h='lg' />
                    <Dropzone
                        allowedTypes={[ObjectTypes.Results.id]}
                        item={resultsFile?.name}
                        onItemChange={handleExperimentalDataChange}>
                        Drag & drop Experimental Results from the explorer
                    </Dropzone>
                    <Space h='lg' />
                    <Dropzone
                        allowedTypes={[ObjectTypes.PlateReader.id]}
                        item={plateOutputFile?.name}
                        onItemChange={handlePlateReaderChange}>
                        Drag & drop Plate Reader Output from the explorer
                    </Dropzone>
                </Stepper.Step>
                <Stepper.Step allowStepSelect={metadataID}
                    label="Collection Info"
                    description="Choose Collection"
                    icon={<TbStatusChange />}>
                    <CollectionInfo />
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={metadataID && Object.keys(collection).length != 0}
                    label="Upload"
                    description="Confirm Selections"
                    icon={<IoIosCloudUpload />}
                >
                    <Group grow style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Group grow style={{ flexDirection: 'row', alignItems: 'flex-start' }} >
                            <ExperimentalTable/>
                            <XDCTimeline status={timelineStatus} />
                        </Group>
                    </Group>
                </Stepper.Step>
            </Stepper>

            <Group position="center" mt="xl">
                <Button
                    variant="default"
                    onClick={prevStep}
                    sx={{ display: activeStep != 0 ? 'block' : 'none' }}
                >
                    Back
                </Button>
                {activeStep == numSteps - 1 ? (
                    <>
                        {(!resultsID && !plateOutputID) ? (
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
                        ) : (
                            <Menu shadow="md" position="bottom-end">
                                <Menu.Target>
                                    <Button
                                        sx={{ display: 'block' }}
                                        disabled={!selectedSBH && !selectedFJ}
                                        radius='xl'
                                        rightIcon={
                                            <span style={{ fontSize: 16, marginLeft: 8 }}>▼</span>
                                        }
                                    >
                                        Upload to...
                                    </Button>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Item
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
                                    >
                                        Synbiohub
                                    </Menu.Item>
                                    <Menu.Item
                                        onClick={() => {
                                            uploadToFlapjack(false)
                                        }}
                                    >
                                        Flapjack
                                    </Menu.Item>
                                    <Menu.Item
                                        onClick={() => {
                                            uploadToFlapjack(true)
                                        }}
                                    >
                                        Synbiohub and Flapjack
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        )}
                    </>
                ) : (
                    <></>
                )}
                {((activeStep == 0 && metadataID) || (activeStep == 1 && Object.keys(collection).length != 0)) ? (
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
