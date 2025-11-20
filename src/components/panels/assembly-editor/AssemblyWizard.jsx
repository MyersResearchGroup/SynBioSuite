import { useState, useEffect } from 'react'
import { Container, Stepper, Group, Button, Tabs, Space, Select, Table, Text } from "@mantine/core"
import { titleFromFileName, useCreateAssemblyFile } from '../../../redux/hooks/workingDirectoryHooks'
import { useContext } from 'react'
import { PanelContext } from './AssemblyPanel'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { useSelector } from 'react-redux'
import PanelSaver from '../PanelSaver'
import { useUnifiedModal } from '../../../redux/hooks/useUnifiedModal';
import { showNotification } from '@mantine/notifications'

const tableContainerStyle = {
    position: 'relative',
    overflowY: 'scroll',
    overflowX: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: '#ccc #f5f5f5',
}

const cellStyle = {
    whiteSpace: 'nowrap',
}

const bounceArrowStyle = {
    position: 'absolute',
    top: '50%',
    right: 8,
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    borderRadius: '50%',
    zIndex: 2,
    animation: 'bounceArrow .4s infinite',
}

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
    const numSteps = 3
    const [activeStep, setActiveStep] = usePanelProperty(panelId, "activeStep", false, 0)
    const nextStep = () => setActiveStep((current) => (current < numSteps ? current + 1 : current))
    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))

    // stepper 1
    const [SBHinstance, setSBHinstance] = usePanelProperty(panelId, "SBHinstance", false, '')
    const [SBHemail, setSBHemail] = usePanelProperty(panelId, "SBHemail", false, '')
    const [depositCollection, setDepositCollection] = usePanelProperty(panelId, "finalCollection", false, '')
    const [collectionInfo, setCollectionInfo] = usePanelProperty(panelId, "collectionInfo", false, null);
    const [userInfo, setUserInfo] = usePanelProperty(panelId, "userInfo", false, null);

    const [abstractDesign, setAbstractDesign] = usePanelProperty(panelId, "abstractDesign", false, '');
    const [abstractDesignInfo, setAbstractDesignInfo] = usePanelProperty(panelId, "abstractDesignInfo", false, null);

    const [selectedPlasmid, setSelectedPlasmid] = usePanelProperty(panelId, "selectedPlasmid", false, null);
    const [selectedPlasmidInfo, setSelectedPlasmidInfo] = usePanelProperty(panelId, "selectedPlasmidInfo", false, null);

    // stepper 2
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

    // workflow calls
    const handleBrowseCollections = () => {
        workflows.browseCollections((data) => {
            if (data && data.completed) {
                try {
                    if (
                        !data.selectedRepo ||
                        !data.userInfo ||
                        !data.userInfo.email ||
                        !data.collections ||
                        !data.collections[0] ||
                        !data.collections[0].uri
                    ) {
                        throw new Error("Missing required data.");
                    }
                    setSBHinstance(data.selectedRepo);
                    setSBHemail(data.userInfo.email);
                    setDepositCollection(data.collections[0].uri);
                    setUserInfo(data.userInfo);
                    setCollectionInfo(data.collections[0]);
                } catch (error) {
                    showNotification({
                        title: 'Failed to Select Collection',
                        message: error.message,
                        color: 'red',
                    });
                }
            }
        });
    };

    const handleInsertAbstractDesign = () => {
        workflows.browseCollections((data) => {
            if (data && data.completed) {
                try {
                    setAbstractDesign(data.collections[0].uri);
                    setAbstractDesignInfo(data.collections[0]);
                } catch (error) {
                    showNotification({
                        title: 'Failed to Insert Abstract Design',
                        message: error.message,
                        color: 'red',
                    });
                }
            }
        });
    };

    // Handler for Select Plasmids
    const handleSelectPlasmid = () => {
        workflows.browseCollections((data) => {
            if (data && data.completed) {
                try {
                    if (
                        !data.selectedRepo ||
                        !data.userInfo ||
                        !data.userInfo.email ||
                        !data.collections ||
                        !data.collections[0] ||
                        !data.collections[0].uri
                    ) {
                        throw new Error("Missing required data.");
                    }
                    setSelectedPlasmid(data.collections[0].uri);
                    setSelectedPlasmidInfo(data.collections[0]);
                } catch (error) {
                    showNotification({
                        title: 'Failed to Select Plasmid',
                        message: error.message,
                        color: 'red',
                    });
                }
            }
        });
    };

    // Handler for Select Backbone
    const handleSelectBackbone = () => {
        workflows.browseCollections((data) => {
            if (data && data.completed) {
                try {
                    if (
                        !data.selectedRepo ||
                        !data.userInfo ||
                        !data.userInfo.email ||
                        !data.collections ||
                        !data.collections[0] ||
                        !data.collections[0].uri
                    ) {
                        throw new Error("Missing required data.");
                    }
                    setSelectedBackbone(data.collections[0].uri);
                    setSelectedBackboneInfo(data.collections[0]);
                } catch (error) {
                    showNotification({
                        title: 'Failed to Select Backbone',
                        message: error.message,
                        color: 'red',
                    });
                }
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
                        onClick={handleBrowseCollections}
                    >
                        Choose Collection to Deposit in SynBioHub
                    </Button>
                    {SBHinstance && depositCollection && collectionInfo && userInfo && (
                        <div style={{ marginBottom: 24, padding: 12, border: '1px solid #eee', borderRadius: 8}}>
                            <b>Selected SynBioHub Instance:</b> {SBHinstance}<br />
                            <b>Username:</b> {userInfo.username || '-'}<br />
                            <b>Email:</b> {userInfo.email || '-'}<br />
                            <b>Collection Name:</b> {collectionInfo.name || collectionInfo.displayId || '-'}<br />
                            <b>Collection URI:</b> {depositCollection}<br />
                            <b>Description:</b> {collectionInfo.description || '-'}<br />
                        </div>
                    )}
                    {SBHinstance && depositCollection && collectionInfo && userInfo && (
                        <Button
                            variant="outline"
                            fullWidth
                            style={{ marginBottom: 16 }}
                            onClick={handleInsertAbstractDesign}
                        >
                            Insert Abstract Design from SynBioHub
                        </Button>
                    )}
                    {SBHinstance && depositCollection && collectionInfo && userInfo && abstractDesign && abstractDesignInfo && (
                        <div style={{ marginBottom: 24, padding: 12, border: '1px solid #eee', borderRadius: 8}}>
                            <b>Design Name:</b> {abstractDesignInfo.name || abstractDesignInfo.displayId || '-'}<br />
                            <b>Design URI:</b> {abstractDesign}<br />
                            <b>Description:</b> {abstractDesignInfo.description || '-'}<br />
                        </div>
                    )}
                    {SBHinstance && depositCollection && collectionInfo && userInfo && abstractDesign && abstractDesignInfo && (
                        <Button
                            variant="outline"
                            fullWidth
                            style={{ marginBottom: 16 }}
                            onClick={handleSelectPlasmid}
                        >
                            Select Plasmids
                        </Button>
                    )}
                    {SBHinstance && depositCollection && collectionInfo && userInfo && abstractDesign && abstractDesignInfo && selectedPlasmid && selectedPlasmidInfo && (
                        <div style={{ marginBottom: 24, padding: 12, border: '1px solid #eee', borderRadius: 8}}>
                            <b>Plasmid Name:</b> {selectedPlasmidInfo.name || selectedPlasmidInfo.displayId || '-'}<br />
                            <b>Plasmid URI:</b> {selectedPlasmid}<br />
                            <b>Description:</b> {selectedPlasmidInfo.description || '-'}<br />
                        </div>
                    )}
                </Stepper.Step>
                <Stepper.Step
                    allowStepSelect={activeStep > 2}
                    label="Assembly"
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
                            {SBHinstance && (
                                <Button
                                    variant="outline"
                                    fullWidth
                                    style={{ marginBottom: 16 }}
                                    onClick={handleSelectBackbone}
                                >
                                    Select Backbone
                                </Button>
                            )}
                            {SBHinstance && selectedBackbone && selectedBackboneInfo && (
                                <div style={{ marginBottom: 24, padding: 12, border: '1px solid #eee', borderRadius: 8}}>
                                    <b>Backbone Name:</b> {selectedBackboneInfo.name || selectedBackboneInfo.displayId || '-'}<br />
                                    <b>Backbone URI:</b> {selectedBackbone}<br />
                                    <b>Description:</b> {selectedBackboneInfo.description || '-'}<br />
                                </div>
                            )}
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
                    label="Execute"
                >
                    <Container>
                        <div ref={null} style={tableContainerStyle}>
                            <Table horizontalSpacing={20}>
                                <thead>
                                    <tr>
                                        <th style={cellStyle}></th>
                                        <th style={cellStyle}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries({
                                        SBHinstance,
                                        SBHemail,
                                        depositCollection,
                                        collectionInfo,
                                        userInfo,
                                        abstractDesign,
                                        abstractDesignInfo,
                                        selectedPlasmid,
                                        selectedPlasmidInfo,
                                        assemblyMethod,
                                        restrictionEnzyme,
                                        compiler,
                                        machine,
                                        selectedBackbone,
                                        selectedBackboneInfo
                                    }).map(([key, value]) => (
                                        <tr key={key}>
                                            <td style={cellStyle}><Text weight={600}>{key}</Text></td>
                                            <td style={cellStyle}>
                                                <Group>
                                                    <Text weight={600}>
                                                        {typeof value === 'object' && value !== null
                                                            ? JSON.stringify(value, null, 2)
                                                            : String(value)}
                                                    </Text>
                                                </Group>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </Container>
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