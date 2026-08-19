import { useEffect, useState } from 'react';
import { Modal, Button } from '@mantine/core';
import FJInstanceSelector from './FJInstanceSelector';
import { Avatar, Text, Group, Grid } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { useDispatch, useSelector } from 'react-redux';
import { setFJPrimary } from '../../redux/slices/primaryRepositorySlice';


function FJModal({ opened, onClose, repoName }) {
    const [repoSelection, setRepoSelection] = useState(repoName);
    
    const [dataFJ, setDataFJ] = useLocalStorage({ key: "Flapjack", defaultValue: [] });
    const dispatch = useDispatch();
    const selectedFJ = useSelector(state => state.primaryRepository.fjPrimary);
    const setSelectedFJ = (value) => dispatch(setFJPrimary(typeof value === 'function' ? value(selectedFJ) : value));
    
    const findInstance = (instance, repo) => {
        return dataFJ.find((element) => element.registryURL === instance);
    }

    const handleRemoveInstance = (repo) => {
        setSelectedFJ(null);
    };

    //To reset the repoSelection state when the modal is closed
    useEffect(() => {
        setRepoSelection("");
    }, [opened]);

    const selectedInstance = (dataFJ || []).find((element) => element.registryURL === selectedFJ) || null;

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
                                style={{ opacity: selectedInstance ? 1 : 0.5 }}
                            />
                            <div>
                                <Text fz="xs" mt={10} fw={700} c="dimmed">
                                    Repository: {selectedInstance ? selectedInstance.registryURL : "Not Logged In"}
                                </Text>

                                <Text fz="lg" fw={500}>
                                    Username: {selectedInstance ? selectedInstance.username : "Not Logged In"}
                                </Text>    
                                <Text mt={3} fz="xs" c="dimmed">
                                    Email: {selectedInstance ? selectedInstance.email : "Not Logged In"}
                                </Text>
                                {selectedInstance ? <>
                                    <Button mt="md" mr="sm" onClick={() => {handleRemoveInstance("Flapjack"); setRepoSelection("Flapjack")}}>
                                        Change Flapjack Repository
                                    </Button>
                                    <Button mt="md" ml="sm" onClick={() => {onClose(); setRepoSelection("")}}>
                                        Confirm Repository Selection
                                    </Button>
                                </> : <Button mt="md" onClick={() => {setRepoSelection("Flapjack")}}>
                                    Select Flapjack Repository
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