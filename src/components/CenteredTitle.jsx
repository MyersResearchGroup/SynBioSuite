import React from 'react'
import { Center, Title } from "@mantine/core"

export default function CenteredTitle({ children, height }) {
  return (
    <Center sx={{ height: height || '100vh' }}>
        <Title order={2} sx={titleStyle}>{children}</Title>
    </Center>
  )
}

const titleStyle = theme => ({
    fontWeight: 600,
    color: theme.other.inactiveColor
})