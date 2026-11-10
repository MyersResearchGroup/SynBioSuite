import { useEffect, useState } from 'react';
import { Modal, Button } from '@mantine/core';
import FJInstanceSelector from './FJInstanceSelector';
import SBHInstanceSelector from './SBHInstanceSelector';
import { Avatar, Text, Group, Grid } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { useDispatch, useSelector } from 'react-redux';
import { setSBHPrimary, setFJPrimary } from '../../redux/slices/primaryRepositorySlice';

// Deterministic username -> "#rrggbb"
const stringToHexColor = (str = "") => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // keep it a 32-bit int
  }
  return "#" + ((hash >>> 0) & 0xffffff).toString(16).padStart(6, "0");
};

// Pick black or white text depending on how light the background is
const getContrastText = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
};

function UserAvatar({ username, size = 94 }) {
  // Logged out: default placeholder, dimmed like your current avatars
  if (!username) {
    return <Avatar size={size} radius="md" style={{ opacity: 0.5 }} />;
  }

  const bg = stringToHexColor(username);

  return (
    <Avatar
      size={size}
      radius="md"
      styles={{
        placeholder: {
          backgroundColor: bg,
          color: getContrastText(bg),
          fontWeight: 600,
        },
      }}
    >
      {Array.from(username)[0].toUpperCase()}
    </Avatar>
  );
}

function LoginModal({ opened, onClose, repoName }) {
    const [repoSelection, setRepoSelection] = useState(repoName);
    
    const [dataSBH, setDataSBH] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const dispatch = useDispatch();
    const selectedSBH = useSelector(state => state.primaryRepository.sbhPrimary);
    const setSelectedSBH = (value) => dispatch(setSBHPrimary(typeof value === 'function' ? value(selectedSBH) : value));
    const [dataFJ, setDataFJ] = useLocalStorage({ key: "Flapjack", defaultValue: [] });
    const selectedFJ = useSelector(state => state.primaryRepository.fjPrimary);
    const setSelectedFJ = (value) => dispatch(setFJPrimary(typeof value === 'function' ? value(selectedFJ) : value));
    
    const findInstance = (uri, repo) => {
        if (repo == "SBH")
            return dataSBH.find((element) => element.registryURL === uri);
        else if (repo == "FJ")
            return dataFJ.find((element) => element.registryURL === uri);
    }

    const handleRemoveInstance = (repo) => {
        if(repo == "SynbioHub") {
            setSelectedSBH(null);
        } else if (repo == "Flapjack") {
            setSelectedFJ(null);
        }
    };

    //To reset the repoSelection state when the modal is closed
    useEffect(() => {
        setRepoSelection("");
    }, [opened]);

    // Safely resolve selected instance info to avoid undefined property access
    // also grabs usernames
    const sbhInfo = selectedSBH ? findInstance(selectedSBH, "SBH") : null;
    const fjInfo = selectedFJ ? findInstance(selectedFJ, "FJ") : null;

    // get the first characters of all the usernames
    // const sbhInitial = sbhInfo?.username?.charAt(0).toUpperCase() ?? "";
    // const fjInitial = fjInfo?.username?.charAt(0).toUpperCase() ?? "";

    return (
        <Modal opened={opened} onClose={onClose} title={`Login to Repository`} size="lg">
            {repoSelection === "" ? (
                <>
                    <Grid>
                        <Grid.Col span={5}>
                            {/* SBH avatar */}
                            <UserAvatar username={sbhInfo?.username} />
                            <div>
                                <Text fz="xs" mt={10} fw={700} c="dimmed">
                                    Repository: {sbhInfo ? sbhInfo.registryURL : "Not Logged In"}
                                </Text>
    
                                <Text fz="lg" fw={500}>
                                    Username: {sbhInfo ? sbhInfo.username : "Not Logged In"}
                                </Text>
    
                                <Group noWrap spacing={10} mt={3}>
                                    <Text fz="xs" c="dimmed">
                                        Email: {sbhInfo ? sbhInfo.email : "Not Logged In"}
                                    </Text>
                                </Group>
                                {selectedSBH ? <Button mt="md" onClick={() => {handleRemoveInstance("SynbioHub"); setRepoSelection("SynbioHub")}}>
                                    Change SynbioHub Repository
                                </Button> : <Button mt="md" onClick={() => {setRepoSelection("SynbioHub")}}>
                                    Select SynbioHub Repository
                                </Button>}
                            </div>
                        </Grid.Col>
                        <Grid.Col span={2}></Grid.Col>
                        <Grid.Col span={5}>
                            {/* FJ avatar */}
                            <UserAvatar username={fjInfo?.username} />
                            <div>
                                <Text fz="xs" mt={10} fw={700} c="dimmed">
                                    Repository: {fjInfo ? fjInfo.registryURL : "Not Logged In"}
                                </Text>
    
                                <Text fz="lg" fw={500}>
                                    Username: {fjInfo ? fjInfo.username : "Not Logged In"}
                                </Text>
    
                                <Group noWrap spacing={10} mt={3}>
                                    <Text fz="xs" c="dimmed">
                                        Email: {fjInfo ? fjInfo.email : "Not Logged In"}
                                    </Text>
                                </Group>
                                {selectedFJ ? <Button mt="md" onClick={() => {handleRemoveInstance("Flapjack"); setRepoSelection("Flapjack")}}>
                                    Change Flapjack Repository
                                </Button> : <Button mt="md" onClick={() => {setRepoSelection("Flapjack")}}>
                                    Select Flapjack Repository
                                </Button>}
                            </div>
                        </Grid.Col>
                    </Grid>
                </>
            ) : (
                repoSelection === "SynbioHub" ?
                        (<SBHInstanceSelector onClose={onClose} setRepoSelection={setRepoSelection} />)
                    :
                        (<FJInstanceSelector onClose={onClose} setRepoSelection={setRepoSelection} />)
                )
            }
        </Modal>
    );
}

export default LoginModal;