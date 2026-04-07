import FolderSelect from './FolderSelect'
import { ActionIcon, Center, Text, Tooltip } from '@mantine/core'
import ExplorerList from './ExplorerList'
import { useWorkingDirectory } from '../../../redux/hooks/workingDirectoryHooks'
import { IoRefreshOutline } from "react-icons/io5"
import { useLocalStorage } from '@mantine/hooks'
import { openDirectory } from '../../../redux/slices/modalSlice'
import { useDispatch } from 'react-redux'
import { APP_VERSION } from '../../../version'

function checkDirectoryVersion(dispatch) {
    dispatch(openDirectory())
}

export default function ExplorerActivityView({objectTypesToList }) {
    const dispatch = useDispatch()

    const [, setFirstTime] = useLocalStorage({ key: 'first-time-visiting', defaultValue: true })

    // handle directory selection
        const [workingDirectory, setWorkingDirectory] = useWorkingDirectory()
        const handleDirectorySelection = dirHandle => {
            setFirstTime(false)
            setWorkingDirectory(dirHandle)
            checkDirectoryVersion(dispatch)
        }

    // handle refreshing working directory
        const refreshWorkDir = () => {
            setWorkingDirectory(workingDirectory, false)
        }

    return workingDirectory ?
        <>
            <ExplorerList workDir = {workingDirectory} objectTypesToList = {objectTypesToList} />
            <Center mt={20}>
                <FolderSelect onSelect={handleDirectorySelection}>
                    Switch Folder
                </FolderSelect>
            </Center>
            <Center mt={4}>
                <Text size="xs" color="dimmed" style={{ fontSize: '0.7rem' }}>v{APP_VERSION}</Text>
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
            <Center mt={4}>
                <Text size="xs" color="dimmed" style={{ fontSize: '0.7rem' }}>v{APP_VERSION}</Text>
            </Center>
        </>
}

        const refreshButtonStyle = theme => ({
        position: 'absolute',
        top: 5,
        right: 5
        })