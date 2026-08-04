import { Modal } from '@mantine/core';
import { TextInput, Button, Group, Space, Checkbox } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { useSelector } from 'react-redux';
import { showNotification } from '@mantine/notifications';
import { createStudySBH, createStudyFJ } from '../API';
import { useState } from 'react';

function CreateCollectionModal({ opened, onClose, studyName, studyDescription, goBack }) {    
    const [instanceData, setInstanceData] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [instanceDataFJ, setInstanceDataFJ] = useLocalStorage({ key: "Flapjack", defaultValue: [] });
    const selected = useSelector(state => state.primaryRepository.sbhPrimary);
    const selectedFJ = useSelector(state => state.primaryRepository.fjPrimary);
    const [overwrite, setOverwrite] = useState(false);
    const studyId = makeIdentifier(studyName || "");

    function makeIdentifier(text) {
        let id = text.trim()
            .replace(/[^A-Za-z0-9]+/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "");

        if (id === "") {
            id = "_";
        } else if (!/^[A-Za-z_]/.test(id)) {
            id = "_" + id;
        }

        return id;
    }

    return (
        <Modal opened={opened} onClose={onClose} title="Create Study" size="lg">
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const id = formData.get('id');
                    const version = formData.get('version');
                    const name = formData.get('name');
                    const description = formData.get('description');
                    const citations = formData.get('citations')
                        .split(',')
                        .map((c) => c.trim())
                        .filter((c) => c);

                    // Validate id: alphanumeric and underscores only
                    if (!/^[a-zA-Z0-9_]+$/.test(id)) {
                        showNotification({
                            title: 'Invalid ID',
                            message: 'ID must be alphanumeric and underscores only.',
                            color: 'red',
                        });
                        return;
                    }
                    const url = selected && selected.trim() !== "" ? selected : null;
                    const instance = instanceData.find((inst) => inst.registryURL === url);
                    const auth = instance ? instance.authtoken : null;
                    const registryAPI = instance?.registryAPI || url;
                    const registryURL = instance?.registryURL || url;
                    const registryPrefix = instance?.registryPrefix || url;

                    const urlFJ = selectedFJ && selectedFJ.trim() !== "" ? selectedFJ : null;
                    const instanceFJ  = instanceDataFJ.find((inst) => inst.registryURL === urlFJ);
                    const authFJ = instanceFJ ? instanceFJ.authtoken : null;
                    const registryAPIFJ = instanceFJ?.registryAPI || urlFJ;
                    const registryURLFJ = instanceFJ?.registryURL || urlFJ;
                    const registryPrefixFJ = instanceFJ?.registryPrefix || urlFJ;

                    if (!url) {
                        showNotification({
                            title: 'No SynBioHub Instance Selected',
                            message: 'Please select a SynbioHub instance before creating a study.',
                            color: 'red',
                        });
                        return;
                    }
                    
                    try {

                        await createStudySBH(id, version, name, description, citations, auth, registryAPI, overwrite);

                        let FJid = null;
                        if (urlFJ) {
                            FJid = await createStudyFJ(id, version, name, description, citations, authFJ, registryAPIFJ, overwrite);
                        }

                        showNotification({
                            title: 'Study Created',
                            message: `Study "${name}" created successfully.`,
                            color: 'green',
                        });

                        const collectionUri =
                                `${registryPrefix}/user/${instance.username}/${id}/${id}_collection/${version}`;

                        const payload = {
                            collectionUri,
                            id,
                            version,
                            name,
                            description,
                            citations,
                            registryURL,
                            registryAPI,
                            registryPrefix,
                            FJid,
                            registryURLFJ,
                            registryAPIFJ,
                            registryPrefixFJ,
                        };

                        onClose(payload);

                    } catch (error) {
                        showNotification({
                            title: 'Error Creating Study',
                            message: error.message || 'Failed to create study',
                            color: 'red',
                        });
                    }
                }}
            >
                <TextInput
                    label="ID"
                    name="id"
                    placeholder="Study ID"
                    defaultValue={studyId}
                    required
                />
                <Space h="md" />
                <TextInput
                    label="Version"
                    name="version"
                    placeholder="1"
                    defaultValue="1"
                    required
                />
                <Space h="md" />
                <TextInput
                    label="Name"
                    name="name"
                    placeholder="Study Name"
                    required
                    defaultValue={studyName}
                />
                <Space h="md" />
                <TextInput
                    label="Description"
                    name="description"
                    placeholder="Describe the study"
                    required
                    defaultValue={studyDescription ? studyDescription : studyName}
                />
                <Space h="md" />
                <TextInput
                    label="Citations"
                    name="citations"
                    placeholder="Comma separated PubMed IDs (e.g. 12345,67890)"
                />
                <Space h="md" />
                <Group position="right" mt="md">
                    <Checkbox
                        label="Overwrite Existing Study and Remove All Prior Contents"
                        checked={overwrite}
                        onChange={(event) => setOverwrite(event.currentTarget.checked)}
                    />
                </Group>
                <Group position="apart">
                    {goBack && (
                        <Button variant="default" onClick={goBack}>
                            Back
                        </Button>
                    )}
                    <Button type="submit" ml={goBack ? undefined : "auto"}>
                        Create
                    </Button>
                </Group>
            </form>
        </Modal>
    );
}

export default CreateCollectionModal;
