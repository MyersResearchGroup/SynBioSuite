import { useState } from 'react'
import { Container, Stepper, Group, Button, Space, Menu, Text, SimpleGrid, Box, Badge, SegmentedControl } from "@mantine/core"
import { BiDownload, BiCloudUpload } from "react-icons/bi"
import AssemblyForm from './AssemblyForm'
import { titleFromFileName, useCreateAssemblyFile } from '../../../redux/hooks/workingDirectoryHooks'
import { useContext } from 'react'
import { PanelContext } from './AssemblyPanel'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { useSelector } from 'react-redux'
import PanelSaver from '../PanelSaver'

export const TabValues = {
    PLASMID: 'plasmid',
    INSERTS: 'inserts',
    PARAMETERS: 'parameters',
    INPUT: 'input'
}

// NOTES 1/22:
/*
 * inserts are not a factor, the assembly involves many plasmids (containing desired parts), which are put together in sbolcanvas
 * create different forms for each type of assembly plan
 *      potentially have synbiohub upload details here
 * change mentions of sbol to assembly plan
 * bp011 = https://github.com/SynBioDex/SBOL-examples/tree/main/SBOL/best-practices/BP011
*/

export default function AssemblyWizard({handleViewResult, isResults = false}) {
    const panelId = useContext(PanelContext)
    const workDir = useSelector(state => state.workingDirectory.directoryHandle)
    PanelSaver(panelId)
    const createFileClosure = useCreateAssemblyFile()

    // file info
    const fileHandle = usePanelProperty(panelId, "fileHandle")
    const panelTitle = titleFromFileName(fileHandle.name)
    const [fileUrl, setFileUrl] = useState()

    // stepper states
    const numSteps = 100
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))
    let showNextButton = true

    const [selectedBox, selectBox] = usePanelProperty(panelId, "selectBox", false, 0)
    const handleBoxSelect = (box) => {
        selectBox(selectedBox === box ? "" : box);
    }

    return (
        <Container style={stepperContainerStyle}>
            <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm">
                <Stepper.Step
                    allowStepSelect={activeStep > 0}
                    label="Abstract Design Selection"
                >
                    <Button
                        variant="outline"
                        fullWidth
                        style={{ marginBottom: 16 }}
                    >
                        Insert Abstract Designs from SynBioHub
                    </Button>
                    <Box mb={16}>
                        <Text weight={500} mb={8}>Imported Abstract Designs</Text>
                        <SimpleGrid cols={1} spacing={4}>
                            <Group spacing="xs">
                                <Badge color="blue" variant="light">{`Design ${1}`}</Badge>
                                <Text size="sm" color="dimmed">{"No description"}</Text>
                            </Group>
                        </SimpleGrid>
                    </Box>
                    <Space h='xl' />
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 1}
                    label="Plasmids and Assembly Type"
                >
                    <AssemblyForm/>
                    <Space h='xl' />

                    <Button
                        variant="outline"
                        fullWidth
                        style={{ marginBottom: 16 }}
                    >
                        Insert Plasmids from SynBioHub
                    </Button>
                    <Box mb={16}>
                        <Text weight={500} mb={8}>Imported Plasmids</Text>
                        <SimpleGrid cols={1} spacing={4}>
                            <Group spacing="xs">
                                <Badge color="blue" variant="light">{`Plasmid ${1}`}</Badge>
                                <Text size="sm" color="dimmed">{"No description"}</Text>
                            </Group>
                        </SimpleGrid>
                    </Box>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 2}
                    label="Backbone Selecetion"
                >
                    <Group position="center" align="center" mb={16}>
                        <Text weight={500}>Enable backbone selection:</Text>
                        <SegmentedControl
                        data={[
                            { label: 'Kanamycin', value: 'Kanamycin' },
                            { label: 'Ampicillin', value: 'Ampicillin' },
                        ]}
                        />
                    </Group>
                    <SimpleGrid cols={2} spacing={16}>
                        <Box
                            p={20}
                            onClick={() => handleBoxSelect("Box 1")}
                            style={{
                                border: selectedBox == "Box 1" ? "2px solid green" : "1px solid #e0e0e0",
                                borderRadius: 8,
                                cursor: 'pointer'
                            }}
                        >
                            <Text color={selectedBox == "Box 1" ? "green" : "dimmed"} weight={500}>Box 1</Text>
                            <Text size="sm" color={selectedBox == "Box 1" ? "green" : "dimmed"}>This would be a valid backbone</Text>
                        </Box>
                        <Box
                            p={20}
                            onClick={() => handleBoxSelect("Box 2")}
                            style={{
                                border: selectedBox == "Box 2" ? "2px solid green" : "1px solid #e0e0e0",
                                borderRadius: 8,
                                cursor: 'pointer'
                            }}
                        >
                            <Text color={selectedBox == "Box 2" ? "green" : "dimmed"} weight={500}>Box 2</Text>
                            <Text size="sm" color={selectedBox == "Box 2" ? "green" : "dimmed"}>This would be a valid backbone</Text>
                        </Box>
                        <Box
                            p={20}
                            onClick={() => handleBoxSelect("Box 3")}
                            style={{
                                border: selectedBox == "Box 3" ? "2px solid green" : "1px solid #e0e0e0",
                                borderRadius: 8,
                                cursor: 'pointer'
                            }}
                        >
                            <Text color={selectedBox == "Box 3" ? "green" : "dimmed"} weight={500}>Box 3</Text>
                            <Text size="sm" color={selectedBox == "Box 3" ? "green" : "dimmed"}>This would be a valid backbone</Text>
                        </Box>
                        <Box
                            p={20}
                            onClick={() => handleBoxSelect("Box 4")}
                            style={{
                                border: selectedBox == "Box 4" ? "2px solid green" : "1px solid #e0e0e0",
                                borderRadius: 8,
                                cursor: 'pointer'
                            }}
                        >
                            <Text color={selectedBox == "Box 4" ? "green" : "dimmed"} weight={500}>Box 4</Text>
                            <Text size="sm" color={selectedBox == "Box 4" ? "green" : "dimmed"}>This would be a valid backbone</Text>
                        </Box>
                    </SimpleGrid>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 2}
                    label="Backbone Selecetion"
                >
                    <Group position='center'>
                        <Box>
                            <SimpleGrid cols={2} spacing={8}>
                                <Box>
                                    <Text size="sm" color="dimmed">Abstract Designs:</Text>
                                    <Text>Design 1</Text>
                                </Box>
                                <Box>
                                    <Text size="sm" color="dimmed">Plasmids:</Text>
                                    <Text>Plasmid 1</Text>
                                </Box>
                                <Box>
                                    <Text size="sm" color="dimmed">Backbone:</Text>
                                    <Text>{selectedBox || "None selected"}</Text>
                                </Box>
                                <Box>
                                    <Text size="sm" color="dimmed">Antiobiotic Resistance:</Text>
                                    <Text>Kanamycin / Ampicillin</Text>
                                </Box>
                                <Box>
                                    <Text size="sm" color="dimmed">Assembly Type:</Text>
                                    <Text>MoClo / Golden Gate / Loop</Text>
                                </Box>
                            </SimpleGrid>
                        </Box>
                    </Group>
                </Stepper.Step>
            </Stepper>
            <Group position="center" mt="xl">
                <Button
                    variant="default"
                    onClick={prevStep}
                    sx={{ display: activeStep == 0 ? 'none' : 'block' }}
                >
                    Back
                </Button>
                {activeStep < 3 ?
                    <Button
                        onClick={nextStep}
                        sx={{ display: showNextButton ? 'block' : 'none' }}
                    >
                        Next step
                    </Button> :
                    <Button
                        type="submit"
                        color='green'
                        radius="xl"
                    >
                        Generate Assembly Plan
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
