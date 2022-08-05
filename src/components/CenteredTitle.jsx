import React from 'react'
import { Box, Center, Title } from "@mantine/core"

export default function CenteredTitle({ children, color, leftIcon, height }) {
    return (
        <Center sx={{ height: height || '100vh' }}>
            {leftIcon && <Box sx={iconStyle(color)}>{leftIcon}</Box>}
            <Title order={2} sx={titleStyle(color)}>{children}</Title>
        </Center>
    )
}

const iconStyle = color => theme => ({
    marginTop: 6,
    marginRight: 10,
    fontSize: 24,
    color: theme.colors[color]?.[5] ||
        color ||
        theme.other.inactiveColor,
})

const titleStyle = color => theme => ({
    fontWeight: 600,
    color: theme.colors[color]?.[5] ||
        color ||
        theme.other.inactiveColor,
})