import { useEffect, useState } from 'react';
import { Modal, Button } from '@mantine/core';
import FJInstanceSelector from './FJInstanceSelector';
import { Avatar, Text, Group, Grid } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';


function FJModal({ opened, onClose, repoName }) {
    const [repoSelection, setRepoSelection] = useState(repoName);
    
    const [dataFJ, setDataFJ] = useLocalStorage({ key: "Flapjack", defaultValue: [] });
    const [selectedFJ, setSelectedFJ] = useLocalStorage({ key: `Flapjack-Primary`, defaultValue: "" });
    
    const findInstance = (instance, repo) => {
        return dataFJ.find((element) => element.value === instance);
    }

    const handleRemoveInstance = (repo) => {
        setSelectedFJ(null);
    };

    //To reset the repoSelection state when the modal is closed
    useEffect(() => {
        setRepoSelection("");
    }, [opened]);

    return (
        <Modal opened={opened} onClose={onClose} title={`Choose Registry`} size="lg">
            {repoSelection === "" ? (
                <>
                    <Grid justify="center">
                        <Grid.Col style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                                <Text mt={3} fz="xs" c="dimmed">
                                    Email: {selectedFJ ? findInstance(selectedFJ, "FJ").email : "Not Logged In"}
                                </Text>
                                {selectedFJ ? <>
                                    <Button mt="md" mr="sm" onClick={() => {handleRemoveInstance("Flapjack"); setRepoSelection("Flapjack")}}>
                                        Change Flapjack Registry
                                    </Button>
                                    <Button mt="md" ml="sm" onClick={() => {onClose(); setRepoSelection("")}}>
                                        Confirm Registry Selection
                                    </Button>
                                </> : <Button mt="md" onClick={() => {setRepoSelection("Flapjack")}}>
                                    Select Flapjack Registry
                                </Button>}
                            </div>
                        </Grid.Col>
                    </Grid>
                </>
            ) : (
                    <FJInstanceSelector onClose={onClose} setRepoSelection={setRepoSelection} />
                )
            }
        </Modal>
    );
}

export default FJModal;