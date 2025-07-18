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
import { submitBuild } from '../../../API'
import { BiDownload } from 'react-icons/bi'
import { FaGithub } from "react-icons/fa";
import { FaRegFileCode } from "react-icons/fa6";
import BuildTable from './BuildTable'


export default function BuildWizard({}) {
    const panelId = useContext(PanelContext)
    const workDir = useSelector(state => state.workingDirectory.directoryHandle)

    // file info
    const fileHandle = usePanelProperty(panelId, "fileHandle")
    const panelTitle = titleFromFileName(fileHandle.name)
    const [fileUrl, setFileUrl] = useState()
    const [backendResponse, setBackendResponse] = usePanelProperty(panelId, 'backendResponse', false, true)
    const [firstBuild, setFirstBuild] = usePanelProperty(panelId, 'firstBuild', false, true)

    const [status, setStatus] = useState(false)
    
    const numSteps = 3
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))

    const [assemblyPlanId, setAssemblyPlanId] = usePanelProperty(panelId, 'assemblyPlan', false)
    const assemblyPlan = useFile(assemblyPlanId)
    const handleAssemblyPlanChange = fileName => { // TODO: add logic to see if returned from backend or not
        setAssemblyPlanId(fileName) 
    }
    const [buildFile, setBuildFile] = usePanelProperty(panelId, 'build', '')

    const setInsertFileHandles = (fileHandles) => {
        insertFiles = fileHandles
    }

    const formValues = usePanelProperty(panelId, 'formValues')

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
                </Stepper.Completed>
                <Stepper.Step
                    allowStepSelect={activeStep > 3}
                    label="Run Build"
                    description="Review and submit."
                    loading={status}>
                    <Space h="xl" />
                    <Space h="sm" />
                    <BuildTable onInsertFilesReady={setInsertFileHandles}/>
                </Stepper.Step>
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
                    <Button onClick={handleBuildSubmit} color="blue" radius = "xl"> 
                        {firstBuild ? "Build" : "Rebuild"}
                    </Button>
                )}
                {status ? <Button color='red' onClick={() => setStatus(false)}>Cancel</Button> : <></>}
                {(!firstBuild && backendResponse && activeStep  == numSteps -1) ?
                    <Button 
                        gradient={{ from: "green", to: "green" }}
                        variant="gradient"
                        radius="xl"
                        onClick={handleFileDownload}
                    >
                        <BiDownload style={{ marginRight: '5px' }} />{panelTitle}.py
                    </Button>
                 : null
                }
            </Group>
        </Container>
    )
}
