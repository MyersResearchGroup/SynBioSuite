import { Group } from "@mantine/core"
import { AiOutlinePlus } from "react-icons/ai"
import { getPrimaryColor } from "../../../modules/colorScheme"
import { Text } from "@mantine/core"

export default function ImportFile({onSelect, text}){

    

    const handleClick = async () => {
        const directoryHandle = await window.showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'desktop'
        })
        
        onSelect?.(directoryHandle)
    }

return (
    <Group
        sx={groupStyle}
        onClick={() => handleClick()}
    >
        <AiOutlinePlus />
        <Text size='sm' sx={textStyle}>{text}</Text>
    </Group>
)


}

const groupStyle = theme => ({
    padding: '3px 0 3px 8px',
    borderRadius: 3,
    cursor: 'pointer',
    color: getPrimaryColor(theme, 5),
    '&:hover': {
        backgroundColor: theme.colors.dark[5]
    }
})

const textStyle = theme => ({
    flexGrow: 1,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    color: getPrimaryColor(theme, 5),
    fontWeight: 500,
})

    