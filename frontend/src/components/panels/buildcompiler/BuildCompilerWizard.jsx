import {
    Alert,
    Button,
    Container,
    Group,
    Loader,
    NumberInput,
    Paper,
    Select,
    Stack,
    Stepper,
    Switch,
    Text,
    TextInput,
} from '@mantine/core';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { ObjectTypes } from '../../../objectTypes';
import { usePanelProperty } from '../../../redux/hooks/panelsHooks';
import {
    createFileInDirectory,
    useFile,
    useReadFileById,
    useWorkingDirectory,
    writeToFileHandle,
} from '../../../redux/hooks/workingDirectoryHooks';
import { authCoordinator } from '../../../modules/auth/authCoordinator.js';
import { MODAL_TYPES, useUnifiedModal } from '../../../modules/unified_modal';
import { buildCompilerClient } from '../../../services/buildCompilerClient.js';
import Dropzone from '../../Dropzone';
import { BuildCompilerPanelContext } from './BuildCompilerPanel';
import {
    approvalsAreComplete,
    buildRunFilename,
    createBuildRunRecord,
    requiredApprovalIds,
} from './buildCompilerWorkflow.js';

const STEPS = ['Design', 'Inventory', 'Configure', 'Plan', 'Approve', 'Compile', 'Results'];

const EMPTY_DESIGN = {
    source: 'project',
    fileId: '',
    uri: '',
    identity: '',
    displayId: '',
};

const readableValue = (value) => {
    if (typeof value === 'string') return value;
    if (value?.message) return value.message;
    if (value?.description) return value.description;
    return JSON.stringify(value);
};

const approvalId = (approval) => typeof approval === 'string' ? approval : approval?.id;

export default function BuildCompilerWizard() {
    const panelId = useContext(BuildCompilerPanelContext);
    const dispatch = useDispatch();
    const { open } = useUnifiedModal();
    const [workingDirectory] = useWorkingDirectory();
    const [activeStep, setActiveStep] = usePanelProperty(panelId, 'activeStep', false, 0);
    const [design, setDesign] = usePanelProperty(panelId, 'design', false, EMPTY_DESIGN);
    const [collections, setCollections] = usePanelProperty(panelId, 'collections', false, []);
    const [options, setOptions] = usePanelProperty(panelId, 'options', false, {});
    const [capabilities, setCapabilities] = usePanelProperty(panelId, 'capabilities', false, null);
    const [plan, setPlan] = usePanelProperty(panelId, 'plan', false, null);
    const [approvals, setApprovals] = usePanelProperty(panelId, 'approvals', false, []);
    const [result, setResult] = usePanelProperty(panelId, 'result', false, null);
    const [loading, setLoading] = useState(false);
    const [activeOperation, setActiveOperation] = useState(null);
    const [error, setError] = useState('');
    const [savedRunName, setSavedRunName] = useState('');
    const requestController = useRef(null);
    const designFile = useFile(design?.fileId);
    const readFileById = useReadFileById();

    useEffect(() => {
        if (capabilities) return;
        let active = true;
        setLoading(true);
        buildCompilerClient.capabilities()
            .then((value) => {
                if (!active) return;
                setCapabilities(value);
                setOptions((current) => Object.keys(current || {}).length
                    ? current
                    : value.defaults || {});
                setError('');
            })
            .catch((requestError) => {
                if (active) setError(requestError.message || 'Unable to load BuildCompiler capabilities.');
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [capabilities, setCapabilities, setOptions]);

    const designIsValid = design?.source === 'synbiohub'
        ? Boolean(design.uri?.trim())
        : Boolean(design.fileId && designFile);
    const approvalIds = requiredApprovalIds(plan);
    const approvalsComplete = approvalsAreComplete(plan, approvals);
    const canAdvance = useMemo(() => {
        if (activeStep === 0) return designIsValid;
        if (activeStep === 1) return collections.length > 0;
        if (activeStep === 2) return Boolean(capabilities);
        if (activeStep === 3) return Boolean(plan);
        if (activeStep === 4) return approvalsComplete;
        return true;
    }, [activeStep, approvalsComplete, capabilities, collections.length, designIsValid, plan]);

    const updateNestedOption = (group, subgroup, key, value) => {
        setOptions((current = {}) => {
            const groupOptions = current[group] || {};
            const nextGroupOptions = subgroup
                ? {
                    ...groupOptions,
                    [subgroup]: { ...(groupOptions[subgroup] || {}), [key]: value },
                }
                : { ...groupOptions, [key]: value };
            return { ...current, [group]: nextGroupOptions };
        });
    };

    const chooseInventory = () => {
        open(MODAL_TYPES.REPOSITORY_SELECTOR, {
            allowedModals: [
                MODAL_TYPES.REPOSITORY_SELECTOR,
                MODAL_TYPES.SBH_CREDENTIAL_CHECK,
                MODAL_TYPES.COLLECTION_BROWSER,
                MODAL_TYPES.SBH_LOGIN,
                MODAL_TYPES.ADD_SBH_REPO,
            ],
            props: { multiSelect: true, rootOnly: true },
            onComplete: (data) => {
                if (!data?.completed) return;
                setCollections((data.collections || []).map((collection) => ({
                    uri: collection.uri,
                    name: collection.name || collection.displayId || collection.uri,
                    registryURL: data.selectedRepo,
                })));
            },
        });
    };

    const requestPayload = async () => {
        const isRemote = design.source === 'synbiohub';
        return {
            design: isRemote
                ? { ...design, registry: collections[0]?.registryURL }
                : {
                    source: 'local',
                    identity: design.identity || undefined,
                    content: await readFileById(design.fileId),
                },
            inventory: {
                registry: collections[0]?.registryURL,
                collections: collections.map(({ uri, name }) => ({ uri, name })),
            },
            options,
        };
    };

    const generatePlan = async () => {
        const controller = new AbortController();
        requestController.current = controller;
        setLoading(true);
        setActiveOperation('plan');
        setError('');
        try {
            const payload = await requestPayload();
            const registryURL = collections[0]?.registryURL;
            const response = design.source === 'synbiohub'
                ? await authCoordinator.runWithCredential(
                    { provider: 'synbiohub', registryURL },
                    ({ credentials, instance }) => buildCompilerClient.plan({
                        ...payload,
                        design: { ...payload.design, registry: instance },
                        inventory: { ...payload.inventory, registry: instance },
                    }, { accessToken: credentials.accessToken, signal: controller.signal }),
                )
                : await buildCompilerClient.plan(payload, { signal: controller.signal });
            setApprovals([]);
            setPlan(response);
        } catch (requestError) {
            const cancelled = requestError.code === 'ERR_CANCELED' || requestError.name === 'AbortError';
            setError(cancelled
                ? 'Build planning was cancelled.'
                : requestError.response?.data?.error?.message
                    || requestError.message
                    || 'Unable to generate the build plan.');
        } finally {
            if (requestController.current === controller) requestController.current = null;
            setLoading(false);
            setActiveOperation(null);
        }
    };

    const compilePlan = async () => {
        const controller = new AbortController();
        requestController.current = controller;
        setLoading(true);
        setActiveOperation('compile');
        setError('');
        try {
            const request = await requestPayload();
            const compilePayload = {
                plan_id: plan.plan_id,
                plan: plan.plan,
                request,
                approvals,
            };
            const registryURL = collections[0]?.registryURL;
            const response = design.source === 'synbiohub'
                ? await authCoordinator.runWithCredential(
                    { provider: 'synbiohub', registryURL },
                    ({ credentials, instance }) => buildCompilerClient.compile({
                        ...compilePayload,
                        request: {
                            ...request,
                            design: { ...request.design, registry: instance },
                            inventory: { ...request.inventory, registry: instance },
                        },
                    }, { accessToken: credentials.accessToken, signal: controller.signal }),
                )
                : await buildCompilerClient.compile(compilePayload, { signal: controller.signal });
            setResult(response);
            setActiveStep(6);
            if (workingDirectory) {
                try {
                    const createdAt = new Date();
                    const runName = buildRunFilename(response.plan_id, createdAt);
                    const buildPlansDirectory = await workingDirectory.getDirectoryHandle(
                        ObjectTypes.BuildCompilerRuns.subdirectory,
                        { create: true },
                    );
                    const runHandle = await createFileInDirectory(
                        buildPlansDirectory,
                        runName,
                        ObjectTypes.BuildCompilerRuns.id,
                        dispatch,
                    );
                    await writeToFileHandle(runHandle, JSON.stringify(createBuildRunRecord({
                        response,
                        createdAt,
                        design,
                        collections,
                        options,
                        plan,
                        approvals,
                        request,
                    }), null, 2));
                    setSavedRunName(runName);
                } catch (saveError) {
                    setError(`Build completed, but the run could not be saved locally: ${saveError.message || 'unknown file error'}`);
                }
            }
        } catch (requestError) {
            const cancelled = requestError.code === 'ERR_CANCELED' || requestError.name === 'AbortError';
            setError(cancelled
                ? 'Build compilation was cancelled.'
                : requestError.response?.data?.error?.message
                    || requestError.message
                    || 'Unable to compile the approved plan.');
        } finally {
            if (requestController.current === controller) requestController.current = null;
            setLoading(false);
            setActiveOperation(null);
        }
    };

    const cancelActiveOperation = () => requestController.current?.abort();

    const downloadArtifact = () => {
        const artifact = result?.artifact;
        if (!artifact?.data) return;
        const binary = window.atob(artifact.data);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: artifact.media_type }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = artifact.filename;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const renderStep = () => {
        if (activeStep === 0) {
            return (
                <Stack spacing="md">
                    <Select
                        label="Design source"
                        value={design?.source || 'project'}
                        data={[
                            { value: 'project', label: 'Local project SBOL file' },
                            { value: 'synbiohub', label: 'SynBioHub design URI' },
                        ]}
                        onChange={(source) => setDesign({ ...EMPTY_DESIGN, source })}
                    />
                    {design?.source === 'synbiohub' ? (
                        <TextInput
                            required
                            label="Design URI"
                            value={design.uri || ''}
                            onChange={(event) => setDesign({ ...design, uri: event.currentTarget.value })}
                            error={!design.uri?.trim() ? 'Enter a SynBioHub design URI.' : null}
                        />
                    ) : (
                        <Dropzone
                            allowedTypes={[ObjectTypes.SBOL.id, ObjectTypes.Plasmids.id]}
                            item={designFile?.name}
                            onItemChange={(fileId) => setDesign({ ...design, fileId })}
                        >
                            Drag & drop an SBOL design from the project explorer
                        </Dropzone>
                    )}
                    <Paper withBorder p="sm">
                        <Text size="sm">Source: {design?.source}</Text>
                        <Text size="sm">Identity: {design?.uri || designFile?.name || 'Not selected'}</Text>
                    </Paper>
                </Stack>
            );
        }
        if (activeStep === 1) {
            return (
                <Stack spacing="md">
                    <Button onClick={chooseInventory}>Select SynBioHub inventory collections</Button>
                    {collections.map((collection) => (
                        <Paper key={collection.uri} withBorder p="sm">
                            <Text weight={500}>{collection.name}</Text>
                            <Text size="xs" color="dimmed">{collection.uri}</Text>
                        </Paper>
                    ))}
                    {!collections.length && <Alert color="yellow">Select at least one inventory collection.</Alert>}
                </Stack>
            );
        }
        if (activeStep === 2) {
            const defaults = options || {};
            return (
                <Stack spacing="md">
                    <NumberInput
                        label="Maximum combinatorial variants"
                        min={1}
                        max={capabilities?.bounds?.max_variants}
                        value={defaults.planning?.combinatorial?.max_variants || 1}
                        onChange={(value) => updateNestedOption('planning', 'combinatorial', 'max_variants', value)}
                    />
                    <NumberInput
                        label="Maximum build iterations"
                        min={1}
                        max={capabilities?.bounds?.max_iterations}
                        value={defaults.execution?.max_iterations || 1}
                        onChange={(value) => updateNestedOption('execution', null, 'max_iterations', value)}
                    />
                    <Select
                        label="Protocol mode"
                        data={(capabilities?.protocol_modes || []).map((mode) => ({ value: mode, label: mode }))}
                        value={defaults.protocol?.mode || 'none'}
                        onChange={(value) => updateNestedOption('protocol', null, 'mode', value)}
                    />
                    <Switch
                        label="Include rejected route alternatives"
                        checked={defaults.reporting?.include_rejected_routes ?? true}
                        onChange={(event) => updateNestedOption('reporting', null, 'include_rejected_routes', event.currentTarget.checked)}
                    />
                </Stack>
            );
        }
        if (activeStep === 3) {
            return plan
                ? (
                    <Stack spacing="md">
                        <Alert color={plan.status === 'blocked' ? 'red' : 'green'}>
                            Plan status: {plan.status || 'preview'}
                        </Alert>
                        <Paper withBorder p="md">
                            <Text weight={500}>Plan {plan.plan_id}</Text>
                            <Text size="sm">
                                Level 2: {plan.summary?.assembly_lvl2 || 0} · Level 1: {plan.summary?.assembly_lvl1 || 0}
                                {' · '}Domestication: {plan.summary?.domestication || 0}
                            </Text>
                        </Paper>
                        {[
                            ['Level 2 assembly', plan.plan?.lvl2_requests],
                            ['Level 1 assembly', plan.plan?.lvl1_requests],
                            ['Domestication', plan.plan?.domestication_requests],
                        ].map(([label, requests]) => requests?.length ? (
                            <Paper key={label} withBorder p="md">
                                <Text weight={500}>{label}</Text>
                                {requests.map((buildRequest, index) => (
                                    <Text key={buildRequest.id || index} size="sm">
                                        {index + 1}. {buildRequest.source_display_id || buildRequest.source_identity || buildRequest.id}
                                    </Text>
                                ))}
                            </Paper>
                        ) : null)}
                        {(plan.plan?.warnings || []).map((warning, index) => (
                            <Alert key={`warning-${index}`} color="yellow">{readableValue(warning)}</Alert>
                        ))}
                        {(plan.plan?.unsupported || []).map((blocker, index) => (
                            <Alert key={`blocker-${index}`} color="red">{readableValue(blocker)}</Alert>
                        ))}
                        <Button variant="light" onClick={generatePlan} loading={activeOperation === 'plan'}>
                            Regenerate plan
                        </Button>
                    </Stack>
                )
                : (
                    <Stack>
                        <Alert color="blue">Evaluate stages, routes, blockers, and approvals before compilation.</Alert>
                        <Button onClick={generatePlan} loading={loading}>Generate plan</Button>
                    </Stack>
                );
        }
        if (activeStep === 4) {
            return (
                <Stack>
                    {(plan?.required_approvals || []).map((approval) => (
                        <Switch
                            key={approvalId(approval)}
                            label={approval.description || approvalId(approval)}
                            checked={approvals.includes(approvalId(approval))}
                            onChange={(event) => setApprovals(event.currentTarget.checked
                                ? [...approvals, approvalId(approval)]
                                : approvals.filter((id) => id !== approvalId(approval)))}
                        />
                    ))}
                    {!plan?.required_approvals?.length && <Text>No approvals are currently required.</Text>}
                    {approvalIds.length > 0 && !approvalsComplete && (
                        <Alert color="yellow">Grant every required approval to continue.</Alert>
                    )}
                </Stack>
            );
        }
        if (activeStep === 5) {
            return (
                <Stack>
                    <Alert color="blue">Compilation uses only the approvals granted for this run.</Alert>
                    <Button
                        onClick={compilePlan}
                        loading={activeOperation === 'compile'}
                        disabled={!capabilities?.http?.compile_available || !approvalsComplete}
                    >
                        Compile approved plan
                    </Button>
                    {activeOperation === 'compile' && (
                        <Button color="red" variant="light" onClick={cancelActiveOperation}>Cancel compilation</Button>
                    )}
                    {!capabilities?.http?.compile_available && (
                        <Text size="sm" color="dimmed">Compilation will become available when the artifact API is enabled.</Text>
                    )}
                </Stack>
            );
        }
        return result
            ? (
                <Stack spacing="md">
                    <Alert color={result.status === 'success' || result.status === 'complete'
                        ? 'green'
                        : result.status === 'failed' ? 'red' : 'yellow'}>
                        Build status: {result.status}
                    </Alert>
                    <Paper withBorder p="md">
                        <Text weight={500}>Plan {result.plan_id}</Text>
                        {savedRunName && <Text size="sm">Saved run: {savedRunName}</Text>}
                        <Text size="sm">Final products: {result.result?.summary?.final_product_count || 0}</Text>
                        <Text size="sm">Missing inputs: {result.result?.summary?.missing_input_count || 0}</Text>
                        <Text size="sm">Warnings: {result.result?.summary?.warning_count || 0}</Text>
                    </Paper>
                    {(result.result?.stage_results || []).map((stage) => (
                        <Paper key={stage.id} withBorder p="md">
                            <Text weight={500}>{stage.stage}: {stage.status}</Text>
                            {(stage.products || []).map((product, index) => (
                                <Text key={`product-${index}`} size="sm">Product: {readableValue(product)}</Text>
                            ))}
                            {(stage.missing_inputs || []).map((item, index) => (
                                <Text key={`missing-${index}`} size="sm" color="red">Missing: {readableValue(item)}</Text>
                            ))}
                            {(stage.warnings || []).map((warning, index) => (
                                <Text key={`warning-${index}`} size="sm" color="yellow">Warning: {readableValue(warning)}</Text>
                            ))}
                            {(stage.logs || []).map((log, index) => (
                                <Text key={`log-${index}`} size="xs" color="dimmed">{readableValue(log)}</Text>
                            ))}
                        </Paper>
                    ))}
                    {result.result?.graph?.nodes?.length > 0 && (
                        <Paper withBorder p="md">
                            <Text weight={500}>Dependency graph (text view)</Text>
                            {result.result.graph.nodes.map((node) => (
                                <Text key={node.id} size="sm">{node.label || node.id} [{node.kind}]</Text>
                            ))}
                            {(result.result.graph.edges || []).map((edge, index) => (
                                <Text key={`${edge.source}-${edge.target}-${index}`} size="xs" color="dimmed">
                                    {edge.source} → {edge.target} ({edge.relationship})
                                </Text>
                            ))}
                        </Paper>
                    )}
                    <Paper withBorder p="md">
                        <Text weight={500}>{result.artifact?.filename || 'Artifact bundle'}</Text>
                        <Text size="sm">Type: {result.artifact?.media_type || 'Not available'}</Text>
                        <Text size="sm">Size: {result.artifact?.size_bytes ?? 'Not available'} bytes</Text>
                        <Text size="sm">SHA-256: {result.artifact?.sha256 || 'Not available'}</Text>
                        {(result.artifact?.contents || []).map((item) => (
                            <Paper key={item.filename} withBorder p="xs" mt="xs">
                                <Text size="sm" weight={500}>{item.filename}</Text>
                                <Text size="xs">{item.type} · {item.stage} · {item.media_type}</Text>
                                <Text size="xs">{item.description}</Text>
                                {item.type === 'sbol' && (
                                    <Text size="xs">SBOL validation: {item.validation_status}</Text>
                                )}
                            </Paper>
                        ))}
                        <Button mt="md" onClick={downloadArtifact} disabled={!result.artifact?.data}>
                            Download artifact bundle
                        </Button>
                        {!result.artifact?.data && <Text size="xs" color="dimmed">Artifact content is unavailable in this saved result.</Text>}
                    </Paper>
                    <details>
                        <summary>Raw BuildCompiler result</summary>
                        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                            {JSON.stringify(result.result, null, 2)}
                        </pre>
                    </details>
                </Stack>
            )
            : <Alert color="gray">Compile a plan to view products, provenance, and artifacts.</Alert>;
    };

    return (
        <Container size="lg" py="xl">
            <Stack spacing="lg">
                <Group position="apart">
                    <div>
                        <Text size="xl" weight={700}>BuildCompiler</Text>
                        <Text size="sm" color="dimmed">
                            {capabilities
                                ? `API ${capabilities.schema_version} · BuildCompiler ${capabilities.buildcompiler?.version}`
                                : 'Loading backend capabilities…'}
                        </Text>
                    </div>
                    {loading && <Loader size="sm" />}
                </Group>
                {error && <Alert color="red">{error}</Alert>}
                <Stepper active={activeStep} onStepClick={(step) => step <= activeStep && setActiveStep(step)}>
                    {STEPS.map((label, index) => (
                        <Stepper.Step key={label} label={label} allowStepSelect={index <= activeStep}>
                            {activeStep === index ? renderStep() : null}
                        </Stepper.Step>
                    ))}
                </Stepper>
                <Group position="center">
                    <Button variant="default" disabled={activeStep === 0} onClick={() => setActiveStep(activeStep - 1)}>
                        Back
                    </Button>
                    <Button
                        disabled={!canAdvance || activeStep === STEPS.length - 1}
                        onClick={() => setActiveStep(activeStep + 1)}
                    >
                        Continue
                    </Button>
                </Group>
            </Stack>
        </Container>
    );
}
