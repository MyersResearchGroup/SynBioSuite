import { useEffect, useState } from 'react';
import { Modal, useMantineTheme } from '@mantine/core';
import { Text } from '@mantine/core';
import { getActiveUser } from '../../microsoft-utils/auth/getActiveUser';
import MicrosoftSignOutButton from './MicrosoftSignOutButton';


export default function MicrosoftModal({ opened, onClose }) {
    const [activeUser, setActiveUser] = useState("");
    // Set the user profile information when the component mounts
    useEffect(() => {
        async function fetchUser() {
            let user = await getActiveUser();
            setActiveUser(user);
        }
        fetchUser();
    }, []);

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
