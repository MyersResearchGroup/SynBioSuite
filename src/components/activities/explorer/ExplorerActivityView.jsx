import FolderSelect from './FolderSelect'
import { ActionIcon, Center, Text, Tooltip } from '@mantine/core'
import ExplorerList from './ExplorerList'
import { useWorkingDirectory } from '../../../redux/hooks/workingDirectoryHooks'
import { IoRefreshOutline } from "react-icons/io5"
import { useLocalStorage } from '@mantine/hooks'

export default function ExplorerActivityView({ }) {

    // handle first time visiting
    const [firstTime, setFirstTime] = useLocalStorage({ key: 'first-time-visiting', defaultValue: true })

    // handle directory selection
    const [workingDirectory, setWorkingDirectory] = useWorkingDirectory()
    const handleDirectorySelection = dirHandle => {
        firstTime && setFirstTime(false)
        setWorkingDirectory(dirHandle)
    }

    // handle refreshing working directory
    const refreshWorkDir = () => {
        setWorkingDirectory(workingDirectory, false)
    }

    return workingDirectory ?
        <>
            <ExplorerList />
            <Center mt={20}>
                <FolderSelect onSelect={handleDirectorySelection}>
                    Switch Folder
                </FolderSelect>
            </Center>
            <Tooltip label="Refresh working directory">
                <ActionIcon sx={refreshButtonStyle} onClick={refreshWorkDir}>
                    <IoRefreshOutline />
                </ActionIcon>
            </Tooltip>
        </> :
        <>
            <Text align='center' size='xs' mt={20}>There's no folder opened.</Text>
            <Center mt={20}>
                <FolderSelect onSelect={handleDirectorySelection} />
            </Center>
        </>
}

const refreshButtonStyle = theme => ({
    position: 'absolute',
    top: 5,
    right: 5
})