import { useState } from 'react';
import { Button, Center, Stack, Title, Text, Avatar, Group, useMantineTheme, Grid, Container } from '@mantine/core';
//import LoginModal from '../modules/modular_login/loginModal';

export default function LoginStatus() {
    const theme = useMantineTheme();
    const [modalOpened, setModalOpened] = useState(false);
    const [repoName, setRepoName] = useState('');
    return (
        <Center style={{
            height: '100vh', background: `radial-gradient(${theme.colors.dark[6]}, ${theme.colors.dark[7]})`
        }}>
            <Container>
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
                            <Button mt="md" onClick={() => {setModalOpened(true); setRepoName('SynbioHub')}}>
                                Open Instance Selector
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
                            <Button mt="md" onClick={() => {setModalOpened(true); setRepoName('Flapjack')}}>
                                Open Instance Selector
                            </Button>
                        </div>
                    </Grid.Col>
                </Grid>
                <LoginModal opened={modalOpened} repoName={repoName} onClose={() => setModalOpened(false)} />
            </Container>
        </Center>
    );
}