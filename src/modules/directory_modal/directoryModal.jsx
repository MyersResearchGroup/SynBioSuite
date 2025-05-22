import { Modal, Button } from '@mantine/core';
import { Text, Grid } from '@mantine/core';

function DirectoryModal({ opened, onClose }) {
    return (
        <Modal opened={opened} onClose={onClose} title={`Update Directory`} size="lg">
                <>
                    <Grid>
                        <Grid.Col span={5}>
                            <Text fz="lg" fw={500}>
                                Directory: "Not Selected"
                            </Text>
                        </Grid.Col>
                    </Grid>
                </>
            <Button onClick={onClose}>Close</Button>
        </Modal>
    );
}

export default DirectoryModal;