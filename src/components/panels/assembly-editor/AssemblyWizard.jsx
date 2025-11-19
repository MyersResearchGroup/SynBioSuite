import { useState } from 'react'
import { Container, Stepper, Group, Button } from "@mantine/core"
import { titleFromFileName, useCreateAssemblyFile } from '../../../redux/hooks/workingDirectoryHooks'
import { useContext } from 'react'
import { PanelContext } from './AssemblyPanel'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { useSelector } from 'react-redux'
import PanelSaver from '../PanelSaver'
import { useUnifiedModal } from '../../../redux/hooks/useUnifiedModal';
import { MODAL_TYPES } from '../../../modules/unified_modal';

export default function AssemblyWizard({}) {
    const panelId = useContext(PanelContext)
    const { workflows, open } = useUnifiedModal();
    PanelSaver(panelId)

    const createFileClosure = useCreateAssemblyFile()
    const workDir = useSelector(state => state.workingDirectory.directoryHandle)

    // file info
    const fileHandle = usePanelProperty(panelId, "fileHandle")
    const panelTitle = titleFromFileName(fileHandle.name)
    const [fileUrl, setFileUrl] = useState()
    
    // stepper states
    const numSteps = 4
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))

    const handleLoginClick = () => {
        // Only allow login, no adding new repositories
        open(MODAL_TYPES.SBH_LOGIN, {
            allowedModals: [MODAL_TYPES.SBH_LOGIN],  // Restricted navigation
            props: {
                customMessage: 'Please login to continue'
            },
            onComplete: (data) => {
                console.log('Workflow completed', data);
            }
        });
    };

    const handleBrowseCollections = () => {
        // Open the collection browser workflow
        workflows.browseCollections((data) => {
            if (data && data.completed) {
                console.log('Collections selected:', data);
                console.log('Repository:', data.selectedRepo);
                console.log('User Info:', data.userInfo);
                console.log('Collections:', data.collections);
                console.log('Count:', data.count);
                // Here you would handle the selected collections
                // e.g., add them to the assembly design, etc.
            }
        });
    };

    return (
        <Container style={{ marginTop: 40, padding: '0 40px' }}>
            <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm">
                <Stepper.Step
                    allowStepSelect={activeStep > 0}
                    label="Designs"
                >
                    <Button
                        variant="outline"
                        fullWidth
                        style={{ marginBottom: 16 }}
                    >
                        Insert Combinatorial Design from SynBioHub
                    </Button>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 1}
                    label="Collections"
                >
                    <Button
                        variant="outline"
                        fullWidth
                        style={{ marginBottom: 16 }}
                        onClick={handleBrowseCollections}
                    >
                        Browse & Select Collections from SynBioHub
                    </Button>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 2}
                    label="Assembly"
                >
                    Machine protocols form
                    <Button
                        variant="outline"
                        fullWidth
                        style={{ marginBottom: 16 }}
                    >
                        Select Plasmids
                    </Button>
                    <Button
                        variant="outline"
                        fullWidth
                        style={{ marginBottom: 16 }}
                    >
                        Select Backbone
                    </Button>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 2}
                    label="Execute"
                >
                    Review Placeholder
                </Stepper.Step>
            </Stepper>
            <Group position="center" mt="xl">
                {activeStep == 0 ? <></> :
                    <Button variant="default" onClick={prevStep}>
                        Back
                    </Button>
                }
                {activeStep === numSteps - 1 ?
                    <Button onClick={() => {alert("Exporting call placeholder\n(Not implemented yet)")}}
                        color='green'
                    >
                        Export
                    </Button>
                :    
                    <Button onClick={nextStep}>
                        Next Step
                    </Button>
                }
            </Group>
        </Container>
    )
}