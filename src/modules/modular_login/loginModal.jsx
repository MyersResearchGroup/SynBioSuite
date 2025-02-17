import { useContext } from 'react';
import { Modal, Button } from '@mantine/core';
import InstanceSelector from './instanceSelector';
import { InstanceContext } from '../../context/InstanceContext';


function LoginModal({ opened, onClose, repoName }) {
    return (
        <Modal opened={opened} onClose={onClose} title={`Log into ${repoName}`} size="lg">
            <InstanceSelector onClose={onClose} />
        </Modal>
    );
}

export default LoginModal;