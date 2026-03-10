import { Container } from "@mantine/core"
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { useContext, useEffect } from 'react'
import { PanelContext } from './TransformationPanel'
import { Button, Group, Stepper, Tabs, Space, Select } from '@mantine/core'

export const Machines = {
    PUDU: {
        OT2: 'OT2'
    },
}

export const AssemblyMethods = {
    MOCLO: 'Modular Cloning',
    LOOP: 'Loop (Coming Soon)',
    GIBSON: 'Gibson (Coming Soon)'
}

export const Compiler = {
    MANUAL: 'Manual (Coming Soon)',
    PUDU: 'Automated (PUDU)',
    PYLAB: 'Automated (PyLab Robot)',
    CLOUD: 'Cloud (Coming Soon)'
}

export const RestrictionEnzymes = {
    MOCLO: {
        BSAI: 'BSAI'
    }
}

export default function TransformationWizard() {
    const panelId = useContext(PanelContext)
    
    const numSteps = 4
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))

const [assemblyMethod, setAssemblyMethod] = usePanelProperty(panelId, "assemblyMethod", false, AssemblyMethods.MOCLO)
    const [restrictionEnzyme, setRestrictionEnzyme] = usePanelProperty(panelId, "restrictionEnzyme", false, RestrictionEnzymes.MOCLO.BSAI)
    const [compiler, setCompiler] = usePanelProperty(panelId, "compiler", false, Compiler.PUDU)
    const [machine, setMachine] = usePanelProperty(panelId, "machine", false, Machines.PUDU.OT2)

    const [selectedBackbone, setSelectedBackbone] = usePanelProperty(panelId, "selectedBackbone", false, null);
    const [selectedBackboneInfo, setSelectedBackboneInfo] = usePanelProperty(panelId, "selectedBackboneInfo", false, null);

    useEffect(() => {
        if (assemblyMethod === AssemblyMethods.MOCLO && restrictionEnzyme !== RestrictionEnzymes.MOCLO.BSAI) {
            setRestrictionEnzyme(RestrictionEnzymes.MOCLO.BSAI);
        }
    }, [assemblyMethod, setRestrictionEnzyme, restrictionEnzyme]);

    return (
        <Container style={{ marginTop: 40, padding: '0 40px' }}>
            <Stepper active={activeStep} onStepClick={setActiveStep}>
                <Stepper.Step
                    allowStepSelect={activeStep > 0}
                    label="Design"
                >
                    <Button
                        variant="outline"
                        fullWidth
                        style={{ marginBottom: 16 }}
                    >
                        Select Abstract Design
                    </Button>
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
                    <Button
                        variant="outline"
                        fullWidth
                        style={{ marginBottom: 16 }}
                    >
                        Select Chassis
                    </Button>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 1}
                    label="Build"
                >
                    <Tabs position='left' value={assemblyMethod} onTabChange={setAssemblyMethod} >
                        <Tabs.List grow>
                            <Tabs.Tab value={AssemblyMethods.GIBSON} disabled>
                                {AssemblyMethods.GIBSON}
                            </Tabs.Tab>
                            <Tabs.Tab value={AssemblyMethods.LOOP} disabled>
                                {AssemblyMethods.LOOP}
                            </Tabs.Tab>
                            <Tabs.Tab value={AssemblyMethods.MOCLO}>
                                {AssemblyMethods.MOCLO}
                            </Tabs.Tab>
                        </Tabs.List>
                        <Space h='md' />
                        <Tabs.Panel value={AssemblyMethods.MOCLO}>
                            <Select
                                label="Restriction Enzyme"
                                data={Object.entries(RestrictionEnzymes.MOCLO).map(([value, label]) => ({
                                    value,
                                    label
                                }))}
                                value={restrictionEnzyme}
                                onChange={setRestrictionEnzyme}
                            />
                            <Space h='lg'/>
                        </Tabs.Panel>
                    </Tabs>
                    <Space h='xl' />
                    <Tabs position='right' value={compiler} onTabChange={setCompiler} >
                        <Tabs.List grow>
                            <Tabs.Tab value={Compiler.PUDU}>
                                {Compiler.PUDU}
                            </Tabs.Tab>
                            <Tabs.Tab value={Compiler.PYLAB} disabled>
                                {Compiler.PYLAB}
                            </Tabs.Tab>
                            <Tabs.Tab value={Compiler.CLOUD} disabled>
                                {Compiler.CLOUD}
                            </Tabs.Tab>
                            <Tabs.Tab value={Compiler.MANUAL} disabled>
                                {Compiler.MANUAL}
                            </Tabs.Tab>
                        </Tabs.List>
                        <Space h='md' />
                        <Tabs.Panel value={Compiler.PUDU}>
                            <Select
                                label="Machine"
                                data={Object.entries(Machines.PUDU).map(([value, label]) => ({
                                    value,
                                    label
                                }))}
                                value={machine}
                                onChange={setMachine}
                            />
                        </Tabs.Panel>
                    </Tabs>
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 2}
                    label="Collection"
                >
                    <Button
                        variant="outline"
                        fullWidth
                        style={{ marginBottom: 16 }}
                    >
                        Select Destination Collection
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
                        Run Workflow
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
