import FolderSelect from './FolderSelect'
import { Center, Text } from '@mantine/core'
import ExplorerList from './ExplorerList'
import { useWorkingDirectory } from '../../../redux/slices/workingDirectorySlice'


export default function ExplorerActivityView({ }) {

    // handle directory selection
    const [workingDirectory, setWorkingDirectory] = useWorkingDirectory()
    const handleDirectorySelection = dirHandle => {
        setWorkingDirectory(dirHandle)
    }

    return workingDirectory ?
        <>
            <ExplorerList />
            <Center mt={20}>
                <FolderSelect onSelect={handleDirectorySelection}>
                    Switch Folder
                </FolderSelect>
            </Center>
        </> :
        <>
            <Text align='center' size='xs' mt={20}>There's no folder opened.</Text>
            <Center mt={20}>
                <FolderSelect onSelect={handleDirectorySelection} />
            </Center>
        </>
}
