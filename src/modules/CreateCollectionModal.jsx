import { Modal } from '@mantine/core';
import { TextInput, Button, Group, Space } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { createCollection } from '../API';

function CreateCollectionModal({ opened, onClose, libraryName, libraryDescription }) {    
    const [instanceData, setInstanceData] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [selected, setSelected] = useLocalStorage({ key: "SynbioHub-Primary", defaultValue: "" });

    return (
        <Modal opened={opened} onClose={onClose} title="Create Collection" size="lg">
            <form
                onSubmit={(e) => {
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
                    createCollection(id, version, name, description, citations, auth, url)

                    onClose();
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
                <Group position="right">
                    <Button type="submit">Create</Button>
                </Group>
            </form>
        </Modal>
    );
}

export default CreateCollectionModal;