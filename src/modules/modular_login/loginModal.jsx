import { useContext, useEffect } from 'react';
import { Modal, Button } from '@mantine/core';
import InstanceSelector from './InstanceSelector';
import { InstanceContext } from '../../context/InstanceContext';


function LoginModal({ opened, onClose, repoName }) {
    return (
        <Modal opened={opened} onClose={onClose} title={`Log into ${repoName}`} size="lg">
            <InstanceSelector onClose={onClose} repoName={repoName} />
        </Modal>
    );
}

export default LoginModal;