import { Button, HoverCard, Stack } from '@mantine/core'
import { FaMagic } from 'react-icons/fa'
import { FiMoreHorizontal } from 'react-icons/fi'
import { ImImage } from 'react-icons/im'

export default function AdditionalButtons({ randomizeColors, handleExport }) {
    return (
        <HoverCard position='bottom-end' transition="scale">
            <HoverCard.Target>
                <Button px={10} variant='outline'><FiMoreHorizontal /></Button>
            </HoverCard.Target>
            <HoverCard.Dropdown sx={hoverDropdownStyle}>
                <Stack align='flex-end'>
                    <Button variant='outline' leftIcon={<FaMagic />} onClick={randomizeColors}>Randomize Colors</Button>
                    <Button variant='outline' leftIcon={<ImImage />} onClick={handleExport}>Export Image</Button>
                </Stack>
            </HoverCard.Dropdown>
        </HoverCard>
    )
}

const hoverDropdownStyle = theme => ({
    backgroundColor: 'transparent',
    border: 'none',
    padding: '20px 0 30px 30px',
})