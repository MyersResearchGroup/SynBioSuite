import { useEffect, useState } from 'react';
import { Modal, Button } from '@mantine/core';
import FJInstanceSelector from './FJInstanceSelector';
import SBHInstanceSelector from './SBHInstanceSelector';
import { Avatar, Text, Group, Grid } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import SBHInstanceLogin from './SBHLogin';
import FJInstanceLogin from './FJInstanceLogin';

function LoginModal({ opened, onClose, repoName }) {
    const [repoSelection, setRepoSelection] = useState(repoName);
    
    const [SBHInstanceData, setSBHInstanceData] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [SBHSelectedInstanceValue, SBHsetSelectedInstanceValue] = useLocalStorage({ key: `SynbioHub-Primary`, defaultValue: "" });
    const [FJInstanceData, setFJInstanceData] = useLocalStorage({ key: "Flapjack", defaultValue: [] });
    const [FJSelectedInstanceValue, FJsetSelectedInstanceValue] = useLocalStorage({ key: `Flapjack-Primary`, defaultValue: "" });
    
    const handleRemoveInstance = (repo) => {
        if(repo == "SynbioHub") {
            SBHsetSelectedInstanceValue(null);
        } else if (repo == "Flapjack") {
            FJsetSelectedInstanceValue(null);
        }
    };

    useEffect(() => {
        setRepoSelection("");
    }, [opened]);

    return (
        <Modal opened={opened} onClose={onClose} title={`Choose Registry`} size="lg">
            {repoSelection === "" ? (
                <>
                    <Grid>
                        {SBHSelectedInstanceValue ?
                            <Grid.Col span={5}>
                                <Avatar
                                    src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-2.png"
                                    size={94}
                                    radius="md"
                                />
                                <div>
                                    <Text fz="xs" mt={10} fw={700} c="dimmed">
                                        Registry: {SBHInstanceData.filter(instance => instance.value == SBHSelectedInstanceValue)[0].instance}
                                    </Text>
        
                                    <Text fz="lg" fw={500}>
                                        Username: {SBHInstanceData.filter(instance => instance.value == SBHSelectedInstanceValue)[0].username}
                                    </Text>
        
                                    <Group noWrap spacing={10} mt={3}>
                                        <Text fz="xs" c="dimmed">
                                            Email: {SBHInstanceData.filter(instance => instance.value == SBHSelectedInstanceValue)[0].email}
                                        </Text>
                                    </Group>
                                    <Button mt="md" onClick={() => {handleRemoveInstance("SynbioHub"); setRepoSelection("SynbioHub")}}>
                                        Change SynbioHub Registry
                                    </Button>
                                </div>
                            </Grid.Col> : <Grid.Col span={5}>
                            <Avatar
                                src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-2.png"
                                size={94}
                                radius="md"
                            />
                            <div>
                                <Text fz="xs" mt={10} fw={700} c="dimmed">
                                    User's Name: Not Logged In
                                </Text>
    
                                <Text fz="lg" fw={500}>
                                    User's Username: Not Logged In
                                </Text>
    
                                <Group noWrap spacing={10} mt={3}>
                                    <Text fz="xs" c="dimmed">
                                        Email: Not Logged In
                                    </Text>
                                </Group>
    
                                <Group noWrap spacing={10} mt={5}>
                                    <Text fz="xs" c="dimmed">
                                        Affiliation: Not Logged In
                                    </Text>
                                </Group>
                                <Button mt="md" onClick={() => {setRepoSelection("SynbioHub")}}>
                                    Select SynbioHub Registry
                                </Button>
                            </div>
                        </Grid.Col>}
                        <Grid.Col span={2}></Grid.Col>
                        {FJSelectedInstanceValue ?
                            <Grid.Col span={5}>
                                <Avatar
                                    src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-2.png"
                                    size={94}
                                    radius="md"
                                />
                                <div>
                                    <Text fz="xs" mt={10} fw={700} c="dimmed">
                                        Registry: Not Logged In
                                    </Text>
        
                                    <Text fz="lg" fw={500}>
                                        Username: Not Logged In
                                    </Text>
        
                                    <Group noWrap spacing={10} mt={3}>
                                        <Text fz="xs" c="dimmed">
                                            Email: Not Logged In
                                        </Text>
                                    </Group>
                                    <Button mt="md" onClick={() => {handleRemoveInstance("Flapjack");}}>
                                        Log out of Flapjack
                                    </Button>
                                </div>
                            </Grid.Col> : <Grid.Col span={5}>
                            <Avatar
                                src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-2.png"
                                size={94}
                                radius="md"
                            />
                            <div>
                                <Text fz="xs" mt={10} fw={700} c="dimmed">
                                    Registry: Not Logged In
                                </Text>
    
                                <Text fz="lg" fw={500}>
                                    Username: Not Logged In
                                </Text>
    
                                <Group noWrap spacing={10} mt={3}>
                                    <Text fz="xs" c="dimmed">
                                        Email: Not Logged In
                                    </Text>
                                </Group>
                                <Button mt="md" onClick={() => {setRepoSelection("Flapjack")}}>
                                    Log into Flapjack
                                </Button>
                            </div>
                        </Grid.Col>}
                    </Grid>
                </>
            ) : (
                repoSelection === "SynbioHub" ? (
                    SBHInstanceData.length === 0 ? (
                        <SBHInstanceLogin onClose={onClose} setRepoSelection={setRepoSelection} />
                    ) : (
                        <SBHInstanceSelector onClose={onClose} setRepoSelection={setRepoSelection} />
                    )
                ) : (
                    FJInstanceData.length === 0 ? (
                        <FJInstanceLogin onClose={onClose} setRepoSelection={setRepoSelection} />
                    ) : (
                        <FJInstanceSelector onClose={onClose} setRepoSelection={setRepoSelection} />
                    )
                )
            )}
        </Modal>
    );
}

export default LoginModal;