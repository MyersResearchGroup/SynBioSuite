import { useEffect, useState } from 'react';
import { Modal, Button } from '@mantine/core';
import FJInstanceSelector from './FJInstanceSelector';
import SBHInstanceSelector from './SBHInstanceSelector';
import { Avatar, Text, Group, Grid } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';


function LoginModal({ opened, onClose, repoName }) {
    const [repoSelection, setRepoSelection] = useState(repoName);
    
    const [dataSBH, setDataSBH] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [selectedSBH, setSelectedSBH] = useLocalStorage({ key: `SynbioHub-Primary`, defaultValue: "" });
    const [dataFJ, setDataFJ] = useLocalStorage({ key: "Flapjack", defaultValue: [] });
    const [selectedFJ, setSelectedFJ] = useLocalStorage({ key: `Flapjack-Primary`, defaultValue: "" });
    
    const findInstance = (instance, repo) => {
        if (repo == "SBH")
            return dataSBH.find((element) => element.value === instance);
        else if (repo == "FJ")
            return dataFJ.find((element) => element.value === instance);
    }

    const handleRemoveInstance = (repo) => {
        if(repo == "SynbioHub") {
            setSelectedSBH(null);
        } else if (repo == "Flapjack") {
            setSelectedFJ(null);
        }
    };

    //To reset the repoSelection state when the modal is closed
    useEffect(() => {
        setRepoSelection("");
    }, [opened]);

    // Safely resolve selected instance info to avoid undefined property access
    const sbhInfo = selectedSBH ? findInstance(selectedSBH, "SBH") : null;
    const fjInfo = selectedFJ ? findInstance(selectedFJ, "FJ") : null;

    return (
        <Modal opened={opened} onClose={onClose} title={`Choose Repository`} size="lg">
            {repoSelection === "" ? (
                <>
                    <Grid>
                        <Grid.Col span={5}>
                            <Avatar
                                src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-2.png"
                                size={94}
                                radius="md"
                                style={{ opacity: selectedSBH ? 1 : 0.5 }}
                            />
                            <div>
                                <Text fz="xs" mt={10} fw={700} c="dimmed">
                                    Repository: {sbhInfo ? sbhInfo.instance : "Not Logged In"}
                                </Text>
    
                                <Text fz="lg" fw={500}>
                                    Username: {sbhInfo ? sbhInfo.username : "Not Logged In"}
                                </Text>
    
                                <Group noWrap spacing={10} mt={3}>
                                    <Text fz="xs" c="dimmed">
                                        Email: {sbhInfo ? sbhInfo.email : "Not Logged In"}
                                    </Text>
                                </Group>
                                {selectedSBH ? <Button mt="md" onClick={() => {handleRemoveInstance("SynbioHub"); setRepoSelection("SynbioHub")}}>
                                    Change SynbioHub Repository
                                </Button> : <Button mt="md" onClick={() => {setRepoSelection("SynbioHub")}}>
                                    Select SynbioHub Repository
                                </Button>}
                            </div>
                        </Grid.Col>
                        <Grid.Col span={2}></Grid.Col>
                        <Grid.Col span={5}>
                            <Avatar
                                src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-2.png"
                                size={94}
                                radius="md"
                                style={{ opacity: selectedFJ ? 1 : 0.5 }}
                            />
                            <div>
                                <Text fz="xs" mt={10} fw={700} c="dimmed">
                                    Repository: {fjInfo ? fjInfo.instance : "Not Logged In"}
                                </Text>
    
                                <Text fz="lg" fw={500}>
                                    Username: {fjInfo ? fjInfo.username : "Not Logged In"}
                                </Text>
    
                                <Group noWrap spacing={10} mt={3}>
                                    <Text fz="xs" c="dimmed">
                                        Email: {fjInfo ? fjInfo.email : "Not Logged In"}
                                    </Text>
                                </Group>
                                {selectedFJ ? <Button mt="md" onClick={() => {handleRemoveInstance("Flapjack"); setRepoSelection("Flapjack")}}>
                                    Change Flapjack Repository
                                </Button> : <Button mt="md" onClick={() => {setRepoSelection("Flapjack")}}>
                                    Select Flapjack Repository
                                </Button>}
                            </div>
                        </Grid.Col>
                    </Grid>
                </>
            ) : (
                repoSelection === "SynbioHub" ?
                        (<SBHInstanceSelector onClose={onClose} setRepoSelection={setRepoSelection} />)
                    :
                        (<FJInstanceSelector onClose={onClose} setRepoSelection={setRepoSelection} />)
                )
            }
        </Modal>
    );
}

export default LoginModal;