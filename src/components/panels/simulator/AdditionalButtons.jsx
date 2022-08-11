import { Button, HoverCard, Stack } from '@mantine/core'
import { FaMagic } from 'react-icons/fa'
import { FiMoreHorizontal } from 'react-icons/fi'
import { ImImage } from 'react-icons/im'
import { RiFileExcel2Line } from "react-icons/ri"
import { AiOutlineTable } from "react-icons/ai"
import { exportToCSV, exportToExcel } from '../../../modules/export'
import { titleFromFileName } from '../../../redux/hooks/workingDirectoryHooks'

export default function AdditionalButtons({ panelId, results, randomizeColors, handleImageExport, whiteBg }) {
    
    const panelTitle = titleFromFileName(panelId)
    const buttonVariant = whiteBg ? 'filled' : 'outline'

    return (
        <HoverCard position='bottom-end' transition="scale">
            <HoverCard.Target>
                <Button px={10} variant='outline'><FiMoreHorizontal /></Button>
            </HoverCard.Target>
            <HoverCard.Dropdown sx={hoverDropdownStyle}>
                <Stack align='flex-end'>
                    <Button variant={buttonVariant} leftIcon={<FaMagic />} onClick={randomizeColors} styles={rainbowButtonStyles(whiteBg)}>Randomize Colors</Button>
                    <Button variant={buttonVariant} leftIcon={<ImImage />} onClick={handleImageExport}>Export Image</Button>
                    <Button variant={buttonVariant} leftIcon={<AiOutlineTable />} onClick={() => exportToCSV(results, panelTitle)}>Export CSV</Button>
                    <Button variant={buttonVariant} leftIcon={<RiFileExcel2Line />} onClick={() => exportToExcel(results, panelTitle)}>Export Excel</Button>
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

const rainbowButtonStyles = whiteBg => theme => {
    // const rainbowGradient = "linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0)), linear-gradient(101deg, #78e4ff, #ff48fa)"
    // const rainbowGradient = "linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0)), linear-gradient(110deg, rgba(255,0,0,1) 0%, rgba(255,154,0,1) 10%, rgba(208,222,33,1) 20%, rgba(79,220,74,1) 30%, rgba(63,218,216,1) 40%, rgba(47,201,226,1) 50%, rgba(28,127,238,1) 60%, rgba(95,21,242,1) 70%, rgba(186,12,248,1) 80%, rgba(251,7,217,1) 90%, rgba(255,0,0,1) 100%)"
    
    // create rainbow gradient
    const rainbowGradient = (level = 4) => {
        const goodColors = Object.values(theme.colors).slice(2).map(colorSet => colorSet[level])
        return `linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0)), linear-gradient(110deg, ${
            goodColors.map((color, i) => `${color} ${Math.round(100 * i / (goodColors.length - 1))}%`).join(', ')
        })`
    }

    return whiteBg ? {
        root: {
            backgroundImage: rainbowGradient(8),
            border: 'none',
        }
    } : {
        root: {
            padding: "0 16px",
            border: "solid 1px transparent",
            backgroundImage: rainbowGradient(4),
            backgroundOrigin: 'border-box',
            backgroundClip: "content-box, border-box",
            boxShadow: `0px 100px 0px ${theme.colors.dark[7]} inset`,
        },
        label: {
            background: rainbowGradient(4),
            backgroundClip: 'text',
            color: 'transparent',
        },
        icon: {
            color: theme.colors.pink[4]
        }
    }
}