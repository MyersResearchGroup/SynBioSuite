import FolderSelect from './FolderSelect'
import { ActionIcon, Center, Text, Tooltip } from '@mantine/core'
import ExplorerList from './ExplorerList'
import { useWorkingDirectory } from '../../../redux/hooks/workingDirectoryHooks'
import { IoRefreshOutline } from "react-icons/io5"
import { useLocalStorage } from '@mantine/hooks'
import { useDispatch } from 'react-redux'
import { APP_VERSION } from '../../../version'
import { useUnifiedModal } from '../../../redux/hooks/useUnifiedModal';
import { useSelector } from 'react-redux';

export default function ExplorerActivityView({objectTypesToList }) {
    const dispatch = useDispatch()

    const [, setFirstTime] = useLocalStorage({ key: 'first-time-visiting', defaultValue: true })

    // handle directory selection
    const [workingDirectory, setWorkingDirectory] = useWorkingDirectory()
  
    const { workflows } = useUnifiedModal();
  
    const handleOpenStudy = dirHandle => {
      setFirstTime(false);
      setWorkingDirectory(dirHandle);
    };

    const handleNewStudy = (dirHandle) => {
      workflows.createStudy(dirHandle, async (data) => {
      
        if (!data?.collectionUri) {
          return;
        }
        
        const {
          collectionUri,
          id,
          version,
          name,
          description,
          citations,
          registryURL,
          registryAPI,
          registryPrefix
        } = data;
        
        const fh = await dirHandle.getFileHandle("study.json", {
          create: true,
        });

        const writable = await fh.createWritable();

        await writable.write(
          JSON.stringify({
            collectionUri,
            id,
            version,
            name,
            description,
            citations,
            registryURL,
            registryAPI,
            registryPrefix
          }, null, 2)
        );
        
        await writable.close();
        
        setFirstTime(false);
        setWorkingDirectory(dirHandle);
      });
    };
  
    // handle refreshing working directory
        const refreshWorkDir = () => {
            setWorkingDirectory(workingDirectory, false)
        }

    return workingDirectory ?
        <>
            <ExplorerList workDir = {workingDirectory} objectTypesToList = {objectTypesToList} />
            <Center mt={20}>
                <FolderSelect onOpenStudy={handleOpenStudy} onNewStudy={handleNewStudy} >
                    Switch Study
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
                <FolderSelect onOpenStudy={handleOpenStudy} onNewStudy={handleNewStudy} />
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

