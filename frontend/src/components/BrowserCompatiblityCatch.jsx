import { useState, useEffect } from 'react'
import { Center, Overlay, Stack, Text, Title } from "@mantine/core"

export default function BrowserCompatiblityCatch() {

    const [compatible, setCompatible] = useState(true)

    // check if browser is compatible on mount
    useEffect(() => {
        setCompatible(
            typeof window.showDirectoryPicker == 'function'
        )
    }, [])

    return compatible ?
        <></> :
        <>
            <Overlay color="black" blur={3} zIndex={5000} />
            <Center sx={messageStyle}>
                <Stack align="center">
                    <Title order={1} sx={titleStyle}>
                        Sorry, this browser is not compatible <span>:(</span>
                    </Title>
                    <Text align='center' sx={textStyle}>
                        We're working on features that will allow 
                        you to use SynBio Suite on more browsers, 
                        but for now, <b>try using Chrome.</b>
                    </Text>
                </Stack>
            </Center>
        </>
}

const messageStyle = theme => ({
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    zIndex: 5001,
})

const titleStyle = theme => ({
    color: 'white',
    marginBottom: 8,
    '& span': {
        color: theme.colors.yellow[4],
        marginLeft: 4,
    }
})

const textStyle = theme => ({
    maxWidth: 600,
    color: theme.colors.gray[5],
})