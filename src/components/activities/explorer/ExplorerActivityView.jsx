import FolderSelect from './FolderSelect'
import { ActionIcon, Center, Group, LoadingOverlay, Text, Tooltip } from '@mantine/core'
import ExplorerList from './ExplorerList'
import { IoRefreshOutline, IoFolderOpenOutline } from "react-icons/io5"
import { useLocalStorage } from '@mantine/hooks'
import { useState } from 'react'
import { usePanelActions } from '../../../state/panelStore'
import { useDocumentActions } from '../../../state/documentStore'

export default function ExplorerActivityView({ }) {

    const { closeAll: closeAllPanels } = usePanelActions()
    const { openDirectory } = useDocumentActions()

    // loading states
    const [loading, setLoading] = useState(false)

    // handle first time visiting
    const [firstTime, setFirstTime] = useLocalStorage({ key: 'first-time-visiting', defaultValue: true })

    // working directory state and handler
    const [workingDirectory, setWorkingDirectory] = useState()
    const changeDirectory = dirHandle => {
        setLoading(true)                    // loading...
        setWorkingDirectory(dirHandle)      // set internal state
        closeAllPanels()                    // close panels
        openDirectory(dirHandle)            // open directory in document store
            .then(() => setLoading(false))
    }
    const handleDirectorySelection = dirHandle => {
        firstTime && setFirstTime(false)
        changeDirectory(dirHandle)
    }

    // handle refreshing working directory
    const refreshWorkDir = () => {
        changeDirectory(workingDirectory)
    }

    return workingDirectory ?
        <>
            <LoadingOverlay visible={loading} overlayBlur={1} />
            <Group position="right" spacing={5} mr={5} >
                <FolderSelect onSelect={handleDirectorySelection} icon={<IoFolderOpenOutline />}>
                    Switch Folder
                </FolderSelect>
                <Tooltip label="Refresh Working Directory">
                    <ActionIcon variant="transparent" onClick={refreshWorkDir}>
                        <IoRefreshOutline />
                    </ActionIcon>
                </Tooltip>
            </Group>
            <ExplorerList />
        </> :
        <>
            <Text align='center' size='xs' mt={20}>There's no folder opened.</Text>
            <Center mt={20}>
                <FolderSelect onSelect={handleDirectorySelection} />
            </Center>
        </>
}
