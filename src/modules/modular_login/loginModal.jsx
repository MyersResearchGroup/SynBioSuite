import { useEffect, useState } from 'react';
import { Modal, Button } from '@mantine/core';
import InstanceSelector from './InstanceSelector';
import { Avatar, Text, Group, Grid } from '@mantine/core';

function LoginModal({ opened, onClose, repoName }) {
    const [repoSelection, setRepoSelection] = useState(repoName);
    
    useEffect(() => {
        setRepoSelection("");
    }, [opened]);

    return (
        <Modal opened={opened} onClose={() => dispatch(closeModal())} title={`Choose Registry`} size="lg">
            {repoSelection === "" ? (
                <>
                <Grid>
                                    <Grid.Col span={5}>
                                        <Avatar
                                            src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-2.png"
                                            size={94}
                                            radius="md"
                                        />
                                        <div>
                                            <Text fz="xs" tt="uppercase" fw={700} c="dimmed">
                                                User's Name
                                            </Text>
                
                                            <Text fz="lg" fw={500}>
                                                User's Username
                                            </Text>
                
                                            <Group noWrap spacing={10} mt={3}>
                                                <Text fz="xs" c="dimmed">
                                                    email@example.com
                                                </Text>
                                            </Group>
                
                                            <Group noWrap spacing={10} mt={5}>
                                                <Text fz="xs" c="dimmed">
                                                    Affiliation
                                                </Text>
                                            </Group>
                                            <Button mt="md" onClick={() => {setRepoSelection("SynbioHub")}}>
                                                Log into SynbioHub
                                            </Button>
                                        </div>
                                    </Grid.Col>
                                    <Grid.Col span={2}></Grid.Col>
                                    <Grid.Col span={5}>
                                        <Avatar
                                            src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-2.png"
                                            size={94}
                                            radius="md"
                                        />
                                        <div>
                                            <Text fz="xs" tt="uppercase" fw={700} c="dimmed">
                                                User's Name
                                            </Text>
                
                                            <Text fz="lg" fw={500}>
                                                User's Username
                                            </Text>
                
                                            <Group noWrap spacing={10} mt={3}>
                                                <Text fz="xs" c="dimmed">
                                                    email@example.com
                                                </Text>
                                            </Group>
                
                                            <Group noWrap spacing={10} mt={5}>
                                                <Text fz="xs" c="dimmed">
                                                    Affiliation
                                                </Text>
                                            </Group>
                                            <Button mt="md" onClick={() => {setRepoSelection("Flapjack")}}>
                                                Log into to Flapjack
                                            </Button>
                                        </div>
                                    </Grid.Col>
                                </Grid>
                    {/*<Button onClick={() => setRepoSelection("SynbioHub")} style={{ float: 'left' }}>Log into SynbioHub</Button>
                    <Button onClick={() => setRepoSelection("Flapjack")} style={{ marginLeft: '3%' }}>Log into Flapjack</Button>*/}
                </>
            ) : (
                <InstanceSelector onClose={onClose} setRepoSelection={setRepoSelection} repoName={repoSelection} />
            )}
        </Modal>
    );
}

export default LoginModal;