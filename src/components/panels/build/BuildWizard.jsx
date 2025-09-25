import { ObjectTypes } from '../../../objectTypes'
import { useFile, titleFromFileName } from '../../../redux/hooks/workingDirectoryHooks'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { useContext } from 'react'
import { PanelContext } from './BuildPanel'
import { Container, Button, Group, Stepper, SegmentedControl, Text, SimpleGrid, Autocomplete } from '@mantine/core'
import Dropzone from '../../Dropzone'


export default function BuildWizard({}) {
    const panelId = useContext(PanelContext)

    // file info
    const fileHandle = usePanelProperty(panelId, "fileHandle")
    const panelTitle = titleFromFileName(fileHandle.name)

    const numSteps = 100
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))

    const [assemblyPlanId, setAssemblyPlanId] = usePanelProperty(panelId, 'assemblyPlan', false)
    const assemblyPlan = useFile(assemblyPlanId)
    const handleAssemblyPlanChange = fileName => { // TODO: add logic to see if returned from backend or not
        setAssemblyPlanId(fileName) 
    }

    const handleFileDownload = async () => {
        try {
            // Fetch the specific file from the public directory
            const response = await fetch('/AWAITING-SBS-PUDU-TEST.py');
            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
            }
            
            const fileContent = await response.blob();
            
            // Use File System Access API if available
            if ('showSaveFilePicker' in window) {
                const options = {
                    suggestedName: `${panelTitle}.py`,
                    types: [{
                        description: 'Python Files',
                        accept: { 'text/x-python': ['.py'] }
                    }]
                };
                
                const fileHandle = await window.showSaveFilePicker(options);
                const writable = await fileHandle.createWritable();
                await writable.write(fileContent);
                await writable.close();
            } else {
                // Fallback for browsers without File System Access API
                const url = URL.createObjectURL(fileContent);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${panelTitle}.py`;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error('Error downloading file:', error);
        }
    };

    return (
        <Container style={{ marginTop: 40, padding: '0 40px' }}>
            <Stepper active={activeStep} onStepClick={setActiveStep}>
                <Stepper.Step
                    allowStepSelect={true}
                    label="Upload Assembly Plan">
                    <Dropzone
                    allowedTypes={ObjectTypes.Assembly.id}
                    item={assemblyPlan?.name}
                    onItemChange={handleAssemblyPlanChange}
                    multiple={false}
                >
                    Drag & drop Assembly Plan file here
                    </Dropzone>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={true}
                    label="Build Parameters"
                >
                    <Group position="center" align="center" mb={16}>
                        <Text weight={500}>Build Type:</Text>
                        <SegmentedControl
                        data={[
                            { label: 'Automated', value: 'Automated' },
                            { label: 'Manual', value: 'Manual' },
                            { label: 'Cloud', value: 'Cloud'}
                        ]}
                        />
                    </Group>
                    <Group position="center" align="center" mb={16}>                
                        <SimpleGrid cols={1} spacing={4}>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                        </SimpleGrid>
                    </Group>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 2}
                    label="Chemical Transformations"
                >
                    <Group position="center" align="center" mb={16}>
                        <Text weight={500}>Build Type:</Text>
                        <SegmentedControl
                        data={[
                            { label: 'Automated', value: 'Automated' },
                            { label: 'Manual', value: 'Manual' },
                            { label: 'Cloud', value: 'Cloud'}
                        ]}
                        />
                    </Group>
                    <Group position="center" grow="true" align="center" mb={16}>
                        <Autocomplete
                            label="Chassis"
                            placeholder="Pick value or enter anything"
                            data={['Chassis', 'Another one', 'Just placeholders']}
                        />
                    </Group>
                    <Group position="center" align="center" mb={16}>   
                        <SimpleGrid cols={1} spacing={4}>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                        </SimpleGrid>
                    </Group>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 3}
                    label="Plating"
                >
                    <Group position="center" align="center" mb={16}>
                        <Text weight={500}>Build Type:</Text>
                        <SegmentedControl
                        data={[
                            { label: 'Automated', value: 'Automated' },
                            { label: 'Manual', value: 'Manual' },
                            { label: 'Cloud', value: 'Cloud'}
                        ]}
                        />
                    </Group>
                    <Group position="center" align="center" mb={16}>   
                        <SimpleGrid cols={1} spacing={4}>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                            <Group spacing="xs">
                                <Text size="sm" color="dimmed">{"Volume #1: 1"}</Text>
                            </Group>
                        </SimpleGrid>
                    </Group>
                </Stepper.Step>
            </Stepper>
            <Group position="center" mt="xl">
                {activeStep == 0 ? <></> :
                    <Button variant="default" onClick={prevStep} disabled={activeStep === 0}>
                        Back
                    </Button>
                }
                {activeStep < 1 ? <></> :
                    <Button color='green'>
                        Generate Mockup
                    </Button>
                }
                {activeStep === 3 ? <></> :    
                    <Button onClick={nextStep}>
                        Next Step
                    </Button>
                }
            </Group>
        </Container>
    )
}
