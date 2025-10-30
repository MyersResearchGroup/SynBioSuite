import { Container, Stepper, Group, Button, Space, ScrollArea } from "@mantine/core"
import { MultiDropzone } from '../../Dropzone'
import { ObjectTypes } from '../../../objectTypes'
import { useContext } from 'react'
import { usePanelProperty } from "../../../redux/hooks/panelsHooks"
import { PanelContext } from './ResourcesPanel'
import PanelSaver from '../PanelSaver'
import CollectionInfo from "./CollectionInfo"
import { showErrorNotification } from "../../../modules/util"


export default function ResourcesWizard() {
    const panelId = useContext(PanelContext)
    PanelSaver(panelId)

    const numSteps = 3
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))

    const [files, setFiles] = usePanelProperty(panelId, 'files', false, []) || []
    const handleFilesChange = name => {
        setFiles([...files, name])
    }

    const [selectedRow, setSelectedRow] = usePanelProperty(panelId, 'collection', false, {})
    const [uploads, setUploads] = usePanelProperty(panelId, 'uploads', false, [])

    const handleRemoveFiles = id => {
        const newFiles = files.filter(item => item !== id)
        setFiles( newFiles)
    }

    const handleUpload = () => {
        setUploads([
            ...uploads,
            {
            collectionName: selectedRow.name,
            uri: selectedRow.uri,
            files: [...files],
            date: new Date().toLocaleString(undefined, { timeZoneName: 'short' })
            }
        ]);
        showErrorNotification("Not Implemented", "Upload functionality is not implemented yet.");
    }

    return (
        <Container style={stepperContainerStyle}>
            <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm">
                <Stepper.Step
                    allowStepSelect={true}
                    label="Choose files"
                >
                    <MultiDropzone
                        allowedTypes={Object.values(ObjectTypes).map(type => type.id)}
                        items={files}
                        onItemsChange={handleFilesChange}
                        onRemoveItem={handleRemoveFiles}
                        multiple={true}
                    >
                        Drag & drop files to upload to SynBioHub
                    </MultiDropzone>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={true}
                    label="Choose collection"
                >
                    <CollectionInfo />
                    <Space h="md" />
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={true}
                    label="See past uploads"
                >
                    <ScrollArea h={600} type="always">
                        {uploads.length === 0 ? (
                            <div>No uploads yet.</div>
                        ) : (
                            uploads.map((upload, idx) => (
                                <div key={idx} style={{ marginBottom: 16, padding: 8, border: '1px solid #eee', borderRadius: 4 }}>
                                    <div>
                                        <strong>Collection Name:</strong> {upload.collectionName}
                                    </div>
                                    <div>
                                        <strong>Collection URL:</strong> {upload.uri}
                                    </div>
                                    <div>
                                        <strong>Date Uploaded:</strong> {upload.date}
                                    </div>
                                    <div>
                                        <strong>Files:</strong>
                                        <ul>
                                            {upload.files.map((file, fidx) => (
                                                <li key={fidx}>{file}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))
                        )}
                    </ScrollArea>
                </Stepper.Step>
            </Stepper>
            <Group position="center" mt="xl">
                <Button
                    variant="default"
                    onClick={prevStep}
                >
                    Back
                </Button>
                {activeStep == 1 &&
                    <Button
                        onClick={() => handleUpload()}
                        color="green"
                    >
                        Upload
                    </Button>
                }
                {activeStep == 0 && 
                    <Button
                        onClick={nextStep}
                    >
                        Next step
                    </Button>
                }
                {activeStep == 1 && 
                    <Button
                        onClick={nextStep}
                    >
                        See Locations
                    </Button>
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
