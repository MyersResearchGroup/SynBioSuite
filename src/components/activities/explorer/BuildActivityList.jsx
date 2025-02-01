import { useWorkingDirectory } from "../../../redux/hooks/workingDirectoryHooks"
import ExplorerList from "./ExplorerList"
import FolderSelect from "./FolderSelect"
import { Text, Center } from "@mantine/core"
import { useLocalStorage } from "@mantine/hooks"
export default function BuildActivityList({filteredActivities}){
    // handle first time visiting
    const [firstTime, setFirstTime] = useLocalStorage({ key: 'first-time-visiting', defaultValue: true })

    // handle directory selection
    const [workingDirectory, setWorkingDirectory] = useWorkingDirectory()
    const handleDirectorySelection = dirHandle => {
        firstTime && setFirstTime(false)
        setWorkingDirectory(dirHandle)
    }
    return(
        workingDirectory ? 
            <ExplorerList currentDirectory={workingDirectory.name} filteredActivities = {filteredActivities}></ExplorerList>
        :
        <>
            <Text align='center' size='xs' mt={20}>There's no folder opened.</Text>
            <Center mt={20}>
                <FolderSelect onSelect={handleDirectorySelection} />
            </Center>
        </>
    )
}