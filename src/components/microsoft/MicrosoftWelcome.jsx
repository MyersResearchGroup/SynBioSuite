import { Center, Space, Stack, Text, Title, useMantineTheme } from '@mantine/core'


export default function MicrosoftWelcome() {

    const theme = useMantineTheme()

    return (
        <Center style={{
            height: '100vh',
            background: `radial-gradient(${theme.colors.dark[6]}, ${theme.colors.dark[7]})`
        }}>
            <Stack align='center'>
                <Text align='center' sx={{ maxWidth: 500 }}>
                    SynBio Suite uses a folder in your Microsoft OneDrive as a working directory. You can place SBOL files,
                    SBML files, and OMEX archives in the directory.
                </Text>
                <Text color='yellow' size='lg' weight={600} align='center' style={{
                    position: 'absolute',
                    top: 290,
                    left: 390,
                    maxWidth: 150,
                }}>
                    To get started, choose a folder in your OneDrive to open.
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