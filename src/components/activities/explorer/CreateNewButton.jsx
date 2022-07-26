import { Group, Text } from '@mantine/core'
import { AiOutlinePlus } from "react-icons/ai"

export default function CreateNewButton({ onClick, children }) {
    return (
        <Group
            sx={groupStyle}
            onClick={onClick}
        >
            <AiOutlinePlus />
            <Text size='sm' sx={textStyle}>{children}</Text>
        </Group>
    )
}

const groupStyle = theme => ({
    padding: '3px 0 3px 8px',
    borderRadius: 3,
    cursor: 'pointer',
    color: theme.colors.blue[5],
    '&:hover': {
        backgroundColor: theme.colors.dark[5]
    }
})

const textStyle = theme => ({
    flexGrow: 1,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    color: theme.colors.blue[5],
    fontWeight: 500,
})