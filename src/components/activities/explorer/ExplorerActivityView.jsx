import FolderSelect from './FolderSelect'
import { ActionIcon, Center, Text, Tooltip } from '@mantine/core'
import ExplorerList from './ExplorerList'
import { useWorkingDirectory } from '../../../redux/slices/workingDirectorySlice'
import { IoRefreshOutline } from "react-icons/io5"

export default function ExplorerActivityView({ }) {

    // handle directory selection
    const [workingDirectory, setWorkingDirectory] = useWorkingDirectory()
    const handleDirectorySelection = dirHandle => {
        setWorkingDirectory(dirHandle)
    }

    // handle refreshing working directory
    const refreshWorkDir = () => {
        setWorkingDirectory(workingDirectory)
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