import { useEffect, useState } from 'react';
import { Modal, Button } from '@mantine/core';
import FJInstanceSelector from './FJInstanceSelector';
import SBHInstanceSelector from './SBHInstanceSelector';
import { Avatar, Text, Group, Grid } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import SBHInstanceLogin from './SBHLogin';
import FJInstanceLogin from './FJLogin';
import AddInstance from './addInstance';


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

    return (
        <Modal opened={opened} onClose={onClose} title={`Choose Registry`} size="lg">
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
                                    Registry: {selectedSBH ? findInstance(selectedSBH, "SBH").instance : "Not Logged In"}
                                </Text>
    
                                <Text fz="lg" fw={500}>
                                    Username: {selectedSBH ? findInstance(selectedSBH, "SBH").username : "Not Logged In"}
                                </Text>
    
                                <Group noWrap spacing={10} mt={3}>
                                    <Text fz="xs" c="dimmed">
                                        Email: {selectedSBH ? findInstance(selectedSBH, "SBH").email : "Not Logged In"}
                                    </Text>
                                </Group>
                                {selectedSBH ? <Button mt="md" onClick={() => {handleRemoveInstance("SynbioHub"); setRepoSelection("SynbioHub")}}>
                                    Change SynbioHub Registry
                                </Button> : <Button mt="md" onClick={() => {setRepoSelection("SynbioHub")}}>
                                    Select SynbioHub Registry
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
                                    Registry: {selectedFJ ? findInstance(selectedFJ, "FJ").instance : "Not Logged In"}
                                </Text>
    
                                <Text fz="lg" fw={500}>
                                    Username: {selectedFJ ? findInstance(selectedFJ, "FJ").username : "Not Logged In"}
                                </Text>
    
                                <Group noWrap spacing={10} mt={3}>
                                    <Text fz="xs" c="dimmed">
                                        Email: {selectedFJ ? findInstance(selectedFJ, "FJ").email : "Not Logged In"}
                                    </Text>
                                </Group>
                                {selectedFJ ? <Button mt="md" onClick={() => {handleRemoveInstance("Flapjack"); setRepoSelection("Flapjack")}}>
                                    Change Flapjack Registry
                                </Button> : <Button mt="md" onClick={() => {setRepoSelection("Flapjack")}}>
                                    Select Flapjack Registry
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