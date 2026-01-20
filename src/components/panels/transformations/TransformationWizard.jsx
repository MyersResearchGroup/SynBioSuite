import { Container } from "@mantine/core"
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { useContext } from 'react'
import { PanelContext } from './TransformationPanel'
import { Button, Group, Stepper } from '@mantine/core'


export default function TransformationWizard() {
    const panelId = useContext(PanelContext)
    
    const numSteps = 4
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))

    return (
        <Container style={{ marginTop: 40, padding: '0 40px' }}>
            <Stepper active={activeStep} onStepClick={setActiveStep}>
                <Stepper.Step
                    allowStepSelect={activeStep > 0}
                    label="Plasmids"
                >
                    <Button
                        variant="outline"
                        fullWidth
                        style={{ marginBottom: 16 }}
                    >
                        Insert Plasmids from SynBioHub
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
                    >
                        Import Strains from SynBioHub
                    </Button>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 2}
                    label="Transform"
                >
                    Machine protocol form
                    <Button
                        variant="outline"
                        fullWidth
                        style={{ marginBottom: 16 }}
                    >
                        Import Chassis from SynBioHub
                    </Button>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 3}
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
                    <Button onClick={() => alert("Exporting call placeholder\n(Not implemented yet)")}
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
