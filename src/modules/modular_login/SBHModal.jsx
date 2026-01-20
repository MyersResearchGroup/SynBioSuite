import { useEffect, useState } from 'react';
import { Modal, Button } from '@mantine/core';
import FJInstanceSelector from './FJInstanceSelector';
import SBHInstanceSelector from './SBHInstanceSelector';
import { Avatar, Text, Group, Grid } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';


function SBHModal({ opened, onClose, repoName }) {
    const [repoSelection, setRepoSelection] = useState(repoName);
    
    const [dataSBH, setDataSBH] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [selectedSBH, setSelectedSBH] = useLocalStorage({ key: `SynbioHub-Primary`, defaultValue: "" });
    
    const findInstance = (instance, repo) => {
        return dataSBH.find((element) => element.value === instance);
    }

    const handleRemoveInstance = (repo) => {
        setSelectedSBH(null);
    };

    //To reset the repoSelection state when the modal is closed
    useEffect(() => {
        setRepoSelection("");
    }, [opened]);

    // Safely resolve selected instance info
    const sbhInfo = selectedSBH ? findInstance(selectedSBH, "SBH") : null;

    return (
        <Modal opened={opened} onClose={onClose} title={`Choose Repository`} size="lg">
            {repoSelection === "" ? (
                <>
                    <Grid justify="center">
                        <Grid.Col style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                                <Text mt={3} fz="xs" c="dimmed">
                                    Email: {sbhInfo ? sbhInfo.email : "Not Logged In"}
                                </Text>
                                {selectedSBH ? <>
                                    <Button mt="md" onClick={() => {handleRemoveInstance("SynbioHub"); setRepoSelection("SynbioHub")}}>
                                        Change SynbioHub Repository
                                    </Button>
                                    <Button mt="md" ml="sm" onClick={() => {onClose(); setRepoSelection("")}}>
                                        Confirm Repository Selection
                                    </Button>
                                </> : <Button mt="md" onClick={() => {setRepoSelection("SynbioHub")}}>
                                    Select SynbioHub Repository
                                </Button>}
                            </div>
                        </Grid.Col>
                    </Grid>
                </>
            ) : (
                    <SBHInstanceSelector onClose={onClose} setRepoSelection={setRepoSelection} />
                )
            }
        </Modal>
    );
}

export default SBHModal;