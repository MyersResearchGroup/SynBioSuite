import { useState } from 'react';
import { Modal, Button } from '@mantine/core';
import InstanceSelector from './InstanceSelector';


function LoginModal({ opened, onClose, repoName }) {
    const [repoSelection, setRepoSelection] = useState("");
    return (
        <Modal opened={opened} onClose={onClose} title={`Choose Registry`} size="lg">
            {repoSelection === "" ? (
                <>
                    <Button onClick={() => setRepoSelection("SynbioHub")} style={{ float: 'left' }}>SynbioHub</Button>
                    <Button onClick={() => setRepoSelection("Flapjack")} style={{ marginLeft: '3%' }}>Flapjack</Button>
                    <Button onClick={() => onClose()} style={{ float: "right" }}>Close</Button>
                </>
            ) : (
                <InstanceSelector onClose={onClose} setRepoSelection={setRepoSelection} repoName={repoSelection} />
            )}
        </Modal>
    );
}

export default LoginModal;