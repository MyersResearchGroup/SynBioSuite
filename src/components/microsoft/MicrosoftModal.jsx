import { useEffect, useState } from 'react';
import { Modal, Button } from '@mantine/core';
import { Avatar, Text, Group, Grid } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';


export default function MicrosoftModal({ opened, onClose }) {
    return (
        <Modal opened={opened} onClose={onClose} title={`Test`} size="lg">
            <Text>Hello</Text>
        </Modal>
    );
}
