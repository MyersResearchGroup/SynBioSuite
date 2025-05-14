import { useState } from 'react'
import { Container, Title } from "@mantine/core"
import { ObjectTypes } from '../../../objectTypes'
import { useFile, titleFromFileName } from '../../../redux/hooks/workingDirectoryHooks'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { useContext, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { PanelContext } from './BuildPanel'
import { Button, Group, Stepper, Space, Menu } from '@mantine/core'
import Dropzone from '../../Dropzone' // adjust import if needed
import BuildForm from './BuildForm'
import { submitBuild } from '../../../SBOL2Build'
import { BiDownload } from 'react-icons/bi'
import { FaGithub } from "react-icons/fa";

export default function BuildWizard({}) {
    const panelId = useContext(PanelContext)
    const workDir = useSelector(state => state.workingDirectory.directoryHandle)

    // file info
    const fileHandle = usePanelProperty(panelId, "fileHandle")
    const panelTitle = titleFromFileName(fileHandle.name)
    const [fileUrl, setFileUrl] = useState()
    const [backendResponse, setBackendResponse] = useState(false)
    const [firstBuild, setFirstBuild] = useState(true)

    const [status, setStatus] = useState(false)
    
    const numSteps = 2
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))

    const [assemblyPlanId, setAssemblyPlanId] = usePanelProperty(panelId, 'assemblyPlan', false)
    const assemblyPlan = useFile(assemblyPlanId)
    const handleAssemblyPlanChange = fileName => { // TODO: add logic to see if returned from backend or not
        setAssemblyPlanId(fileName) 
    }
    const [buildFile, setBuildFile] = usePanelProperty(panelId, 'build', '')


    const formValues = usePanelProperty(panelId, "formValues")

    let showNextButton = false
    switch (activeStep) {
        case 0: showNextButton = !!assemblyPlanId
        break
        case 1: showNextButton = formValues?.buildMethod == "Automated"
    }

    useEffect(() => {
        const setup = async () => {
            const subdirectoryHandle = await workDir.getDirectoryHandle('builds', { create: true });
            const handle = await createFileClosure(panelTitle + '.xml', 'synbio.object-type.build', subdirectoryHandle)
            const file = await handle.getFile();
            const url = URL.createObjectURL(file);
            setFileUrl(url);
        };
        if (backendResponse) setup();
        return () => { if (fileUrl) URL.revokeObjectURL(fileUrl); };
    }, [buildFile]);

    const handleBuildSubmit = async () => {
        setBackendResponse(false)
        setStatus(true)
        await new Promise(resolve => setTimeout(resolve, 2000))
        setStatus(false)
        setBackendResponse(true)
        setFirstBuild(false)
        return true
        try {
            await new Promise(resolve => setTimeout(resolve, 2000))
            const result = await submitBuild(fileHandle, assemblyPlan)
            console.log(result)
        } catch (error) {
            console.error(error)
        } finally {
            setStatus(false)
            setFirstBuild(false)
        }
    }

    return (
        <Container style={{ marginTop: 40, padding: '0 40px' }}>
            <Stepper active={activeStep} onStepClick={setActiveStep} color="blue" size="sm" mb="md">
                <Stepper.Step
                    allowStepSelect={activeStep > 0}
                    label="Upload Assembly Plan"
                    description="Upload the assembly plan file.">
                    <Title order={3} align="center" mb="md">
                    Upload Assembly Plan
                    </Title>
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
                    allowStepSelect={activeStep > 1}
                    label="Build Parameters"
                    description="Set the build parameters."
                    loading={status}
                >
                    <Space h="xl" />
                        <h2 style={{ textAlign: 'center' }}>
                            Enter Build Parameters
                        </h2>
                        <BuildForm /> 
                </Stepper.Step>
                <Stepper.Completed
                    allowStepSelect={activeStep > 2}
                    label="Generate SBOL"
                    loading={status}
                >
                    <Space h='lg' />
                    <Group grow style={{ alignItems: 'flex-start' }}>
                        <></>
                    </Group>
                </Stepper.Completed>
            </Stepper>
            <Group position="center" mt="xl">
                {activeStep == 0 ? <></> :
                    <Button variant="default" onClick={prevStep} disabled={activeStep === 0}>
                        Back
                    </Button>
                }
                {activeStep === numSteps - 1 ? <></> :    
                    <Button onClick={nextStep} disabled={!showNextButton}>
                        Next Step
                    </Button>
                }
                {activeStep === numSteps - 1 && !status && (
                    <Button onClick={handleBuildSubmit} color="blue">
                        {firstBuild ? "Build" : "Rebuild"}
                    </Button>
                )}
                {status ? <Button color='red' onClick={() => setStatus(false)}>Cancel</Button> : <></>}
                {(formValues?.buildMethod === "Automated" && backendResponse && activeStep === 1) && (
                    <Menu trigger="hover" closeDelay={250}>   
                        <Menu.Target>
                            <Button 
                            gradient={{ from: "green", to: "green" }}
                            variant="gradient"
                            radius="xl"
                            >{panelTitle}.py</Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                        <Menu.Label>Build SBOL</Menu.Label>
                            <Menu.Item 
                                component="a"
                                href={fileUrl}
                                download={`${panelTitle}.xml`}
                                icon={<BiDownload />}>
                                Download
                            </Menu.Item>
                            <Menu.Item icon={<FaGithub/>}>
                                Upload to Github
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                )}
            </Group>
        </Container>
    )
}
