import { act, useEffect, useState } from 'react';
import { Modal, Button, useMantineTheme } from '@mantine/core';
import { Avatar, Text, Group, Grid } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { getActiveUser } from '../../microsoft-utils/getActiveUser';
import MicrosoftSignOutButton from './MicrosoftSignOutButton';


export default function MicrosoftModal({ opened, onClose }) {
    const theme = useMantineTheme()

    const [activeUser, setActiveUser] = useState("");
    // Set the user profile information when the component mounts
    useEffect(() => {
        async function fetchUser() {
            let user = await getActiveUser();
            setActiveUser(user);
        }
        fetchUser();
    }, []);
    console.log("USER:", activeUser)

    return (
        <Modal opened={opened} onClose={onClose} title={`Microsoft One Drive (${activeUser?.name})`} size="lg" >
            <div style={{
                display: 'flex', 
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
            }}>
                <Text>
                    You are currently signed in to {" "}
                    <Text span fw={1000}>
                        {activeUser?.username}
                    </Text>
                    .
                </Text>
                <MicrosoftSignOutButton />
            </div>
        </Modal>
    );
}
