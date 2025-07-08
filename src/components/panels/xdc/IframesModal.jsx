import { Modal} from "@mantine/core";
import { Text, Grid, Button } from "@mantine/core";
import { Space } from "@mantine/core";

function IframesModal({opened, onClose}){
    return (
        <Modal opened={opened} onClose={onClose} title={`Login not Unified`} size="lg">
                <>
                    <Grid>
                        <Grid.Col span={5}>
                            <Text  fz="lg" fw={500} style = {{whiteSpace: "nowrap"}}>
                                Unfortunately, unified login is not supported yet.
                            </Text>
                        </Grid.Col>
                    </Grid>
                </>
            <Space h='sm' />
            <Button onClick={onClose}>Close</Button>
        </Modal>
    );
}

export default IframesModal;