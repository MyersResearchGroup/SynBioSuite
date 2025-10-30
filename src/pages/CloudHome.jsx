import { Button, Center, Space, Stack, Text, Title, useMantineTheme } from '@mantine/core'


export default function CloudHome() {

    const theme = useMantineTheme()

    return (
        <Center style={{
            height: '100vh',
            width: ' 100vw',
            background: `radial-gradient(${theme.colors.dark[6]}, ${theme.colors.dark[7]})`
        }}>
            <Stack align='center'>
                <Text>
                    HELLO 
                </Text>
            </Stack>
        </Center>
    )
}