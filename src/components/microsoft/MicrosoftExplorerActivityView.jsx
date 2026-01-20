import { ActionIcon, Center, Text, Tooltip } from '@mantine/core'
import { IoRefreshOutline } from "react-icons/io5"
import { useLocalStorage } from '@mantine/hooks'
import MicrosoftFolderPicker from './MicrosoftFolderPicker'
import MicrosoftExplorerList from './MicrosoftExplorerList'
import { useEffect } from 'react'

export default function MicrosoftExplorerActivityView({objectTypesToList }) {
    const [oneDriveFolder] = useLocalStorage({ key: 'one-drive-folder', defaultValue: null })
    const [firstTime, setFirstTime] = useLocalStorage({ key: 'first-time-visiting', defaultValue: true })
    
    // TODO: Move this to an alternate location that is shared
    useEffect(() => {
        if (oneDriveFolder !== null){
            setFirstTime(false)
        }
    }, [oneDriveFolder])

    return oneDriveFolder ?
        <>
            <MicrosoftExplorerList objectTypesToList = {objectTypesToList}/>
            <Center mt={20}>
                <MicrosoftFolderPicker buttonName='Switch OneDrive Folder'/>
            </Center>
            <Tooltip label="Refresh working directory">
                <ActionIcon sx={refreshButtonStyle}>
                    <IoRefreshOutline />
                </ActionIcon>
            </Tooltip>
        </> :
        <>
            <Text align='center' size='xs' mt={20}>There's no folder opened.</Text>
            <Center mt={20}>
                <MicrosoftFolderPicker buttonName='Open Folder on OneDrive' />
            </Center>
        </>
}

        const refreshButtonStyle = theme => ({
        position: 'absolute',
        top: 5,
        right: 5
        })