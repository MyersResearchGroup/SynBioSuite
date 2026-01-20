import { Button, Center, Space, Stack, Text, Title, useMantineTheme } from '@mantine/core'
import MicrosoftSignInButton from '../components/microsoft/MicrosoftSignInButton'
import { useNavigate } from 'react-router-dom';


export default function LandingPage() {

    const navigate = useNavigate();
    const theme = useMantineTheme();

    return (
        <Center style={{
            height: '100vh',
            width: '100vw',
            background: `radial-gradient(${theme.colors.dark[6]}, ${theme.colors.dark[7]})`
        }}>
            <Stack align='center'>
                <Title order={1}>
                    Welcome to
                </Title>
                <img src="/logo-dark.png" style={{ width: 520 }} />
                <Space h='xs' />
                <Title order={5} sx={{
                    fontWeight: '500',
                    color: theme.colors.gray[5],
                    textAlign: 'center'
                }}>
                    A synthetic biology design and analysis tool from
                    the <a href="https://geneticlogiclab.org/" style={{ color: theme.colors.yellow[5] }} target="_blank">Genetic Logic Lab</a>
                </Title>
                <Space h={20} />
                <Text align='center' sx={{ maxWidth: 700 }}>
                    SynBioSuite uses your harddrive to keep your files stored locally on your computer. Note: This functionality only exists on Google Chrome and Chromium based browsers. This means SynBioSuite is not supported on Safari or Firefox.
                </Text>
                <Button onClick={() => navigate("/local")}>
                    Use my local file system through Chrome
                </Button>
                {false && <>
                <Text align='center' sx={{ maxWidth: 700 }}>
                    SynBio Suite can also be connected to your Microsoft OneDrive. To sign in with Microsoft and connect SynBio Suite, select the option below.
                </Text>
                <MicrosoftSignInButton /></>}
            </Stack>
        </Center>
    )
}