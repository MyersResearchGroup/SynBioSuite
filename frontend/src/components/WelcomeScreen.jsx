import { Center, Space, Stack, Text, Title, useMantineTheme } from '@mantine/core'


export default function WelcomeScreen() {

    const theme = useMantineTheme()

    return (
        <Center style={{
            height: '100vh',
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
                <Text align='center' sx={{ maxWidth: 500 }}>
                    SynBio Suite uses a local folder on your device as a working directory. You can place SBOL files,
                    SBML files, and OMEX archives in the directory.
                </Text>
                <Text color='yellow' size='lg' weight={600} align='center' style={{
                    position: 'absolute',
                    top: 290,
                    left: 390,
                    maxWidth: 150,
                }}>
                    To get started, choose a folder to open.
                    </Text>

                <img src="/left-arrow-sketch.svg" style={{
                    width: 200,
                    position: 'absolute',
                    top: 200,
                    left: 160,
                    transform: 'scaleY(-1) rotate(-70deg)',
                    ...svgStyles
                }} />
                <img src="/circle.svg" style={{
                    width: 150,
                    position: 'absolute',
                    top: 35,
                    left: 115,
                    transform: 'scale(1.05) rotate(-70deg)',
                    ...svgStyles,
                }} />
            </Stack>
        </Center>
    )
}

const svgStyles = {
    filter: 'invert(100%) brightness(80%)',
    pointerEvents: 'none',
    opacity: 0.5,
}