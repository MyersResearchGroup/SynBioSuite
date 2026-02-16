import { Modal } from '@mantine/core';
import { TextInput, Button, Group, Space, Checkbox } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { createCollection } from '../API';
import { useState } from 'react';

function CreateCollectionModal({ opened, onClose, libraryName, libraryDescription, goBack }) {    
    const [instanceData, setInstanceData] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [selected, setSelected] = useLocalStorage({ key: "SynbioHub-Primary", defaultValue: "" });
    const [overwrite, setOverwrite] = useState(false);

    return (
        <Modal opened={opened} onClose={onClose} title="Create Collection" size="lg">
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
                    const instance = instanceData.find((inst) => inst.value === url);
                    const auth = instance ? instance.authtoken : null;
                    if (!url) {
                        showNotification({
                            title: 'No Instance Selected',
                            message: 'Please select a SynbioHub instance before creating a collection.',
                            color: 'red',
                        });
                        return;
                    }
                    
                    try {
                        await createCollection(id, version, name, description, citations, auth, url, overwrite);

                        if (goBack) {
                            goBack();
                        } else {
                            onClose();
                        }
                    } catch (error) {
                        showNotification({
                            title: 'Error',
                            message: error.message || 'Failed to create collection',
                            color: 'red',
                        });
                    }
                }}
            >
                <TextInput
                    label="ID"
                    name="id"
                    placeholder="BBa_R0010"
                    defaultValue={libraryName}
                    required
                />
                <Space h="md" />
                <TextInput
                    label="Version"
                    name="version"
                    placeholder="1"
                    required
                />
                <Space h="md" />
                <TextInput
                    label="Name"
                    name="name"
                    placeholder="Collection Name"
                    required
                    defaultValue={libraryName}
                />
                <Space h="md" />
                <TextInput
                    label="Description"
                    name="description"
                    placeholder="Describe the collection"
                    defaultValue={libraryDescription}
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
                        label="Overwrite existing files in the collection"
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