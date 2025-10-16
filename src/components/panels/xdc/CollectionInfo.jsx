import { useContext, useState, useEffect } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { PanelContext } from './CollectionPanel'
import { Select, Table, Space, Button, Group, ScrollArea } from '@mantine/core'
import { useLocalStorage } from '@mantine/hooks'
import { useDispatch, useSelector } from 'react-redux'
import { useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { openAddSBHrepository, openCreateCollection, openSBHLogin } from '../../../redux/slices/modalSlice'
import { SBHLogout, searchCollections } from '../../../API'
import { showNotification } from '@mantine/notifications'
import { read, utils } from 'xlsx'

export default function CollectionInfo() {

    const panelId = useContext(PanelContext)
    const dispatch = useDispatch();

    const [dataSBH, setDataSBH] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [dataPrimarySBH, setDataPrimarySBH] = useLocalStorage({ key: "SynbioHub-Primary", defaultValue: [] });

    const getAuthToken = () => {
        if (!dataPrimarySBH || !dataSBH || dataPrimarySBH?.length === 0 || dataSBH?.length === 0) return null;
        const primaryValue = dataPrimarySBH;
        const matchedRepo = dataSBH.find((repo) => repo.value === primaryValue);
        return matchedRepo ? matchedRepo.authtoken : null;
    };

    // To read collection info from excel file
    const [metadataID, setMetadataID] = usePanelProperty(panelId, 'metadata', false)
    const metadataFile = useFile(metadataID)

    // Variables to store the collection name and description from the metadata
    const [collectionName, setCollectionName] = useState("")
    const [collectionDescription, setCollectionDescription] = useState("")
    
    // JSON object of {description, displayID, name, uri, version}
    const [selectedRow, setSelectedRow] = usePanelProperty(panelId, 'collection', false, {})

    // Allows detection of if modal to add new synbiohub url is open
    const addSBHRepositoryOpened = useSelector((state) => state.modal.addSBHRepository);

    // This is to prevent the selector from freaking out when it is expecting a new SynbioHub URL and doesn't get one since the user exists the modal preamturely
    // This also safeguards the selector from freaking out in case another workflow modifies the list of repositories
    useEffect(() => {
        if (!addSBHRepositoryOpened) {
            if (dataPrimarySBH?.length > 0) {
                setSelectedRepo(dataPrimarySBH);
            } else if (dataSBH?.length > 0) {
                setSelectedRepo(dataSBH[0].value);
            } else {
                setSelectedRepo('Please Select a Repository');
            }
        }
    }, [addSBHRepositoryOpened, dataPrimarySBH, dataSBH]);

    // Functions to read the collection name and description for the metadata -- not used currently
    const getDescriptionandLibraryName = async () => {
        const realFile = await metadataFile.getFile()
        const arrayBuffer = await realFile.arrayBuffer()
        const wb = read(arrayBuffer, { type: "array" })
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rows = utils.sheet_to_json(ws, { raw: false, header: 1, blankrows: true, defval: null });

        let temp_libraryName = null
        let temp_description = null

        for (const row of rows) {
            for (let i = 0; i < row.length; i++) {
                if (row[i] && typeof row[i] === "string") {
                    const cell = row[i].toLowerCase()
                    if (cell.includes("library name") || cell.includes("collection name")) {
                        temp_libraryName = row[i+1]
                    }
                    if (cell.includes("description")) {
                        temp_description = row[i+1]
                    }
                }
            }
        }

        return {temp_libraryName, temp_description}
    }

    const refreshCollectionInfo = () => {
        getDescriptionandLibraryName()
    }


    const [collections, setCollections] = useState([])

    useEffect(() => {
        // Prevents the many empty reloads from occuring when the component is first loading in
        const timer = setTimeout(async () => {
            const authToken = getAuthToken();
            const url = dataPrimarySBH;
            try {
                const tempCollections = await searchCollections(url, authToken);
                setCollections(Array.isArray(tempCollections) ? tempCollections : []);
            } catch (err) {
                setCollections([]);
                console.error('Error fetching collections:', err);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [dataPrimarySBH, dataSBH]);

    // Callback function to be used inside create collection modal
    const updateCollections = async () => {
        setCollections([])
        await new Promise(resolve => setTimeout(resolve, 2000));
        const authToken = getAuthToken();
        const url = dataPrimarySBH;
        const tempCollections = await searchCollections(url, authToken);
        setCollections(Array.isArray(tempCollections) ? tempCollections : []);
    }

    // Opens the create collection modal
    const createCollection = async () => {
        const {temp_libraryName, temp_description} = await getDescriptionandLibraryName();
        if (temp_libraryName) setCollectionName(temp_libraryName)
        if (temp_description) setCollectionDescription(temp_description)

        // Use the latest state values after update
        dispatch(openCreateCollection({
            callback: () => updateCollections(),
            libraryName: temp_libraryName,
            libraryDescription: temp_description,
        }));
    }

    // This is to manage the mantine selector component
    const [selectedRepo, setSelectedRepo] = useState(
        dataPrimarySBH?.length > 0 ? dataPrimarySBH.value : ''
    );

    const handleLogout = () => {
        const updatedInstanceData = dataSBH.filter((item) => item.instance !== selectedRepo);
        setDataSBH(updatedInstanceData);
        setDataPrimarySBH("")
        setSelectedRepo("Select a repository")
        
        showNotification({
            title: 'Logout Successful',
            message: 'You have successfully logged out of the repository',
            color: 'green',
        });
    }

    return (
        <>
            <Select
                data={[
                    {
                        value: 'Select a repository',
                        label: 'Select a repository',
                        disabled: true
                    },
                    ...dataSBH.map((sbh) => ({
                        value: sbh.value,
                        label: sbh.label,
                    })),
                    {
                        value: 'add-repository',
                        label: (
                            <span style={{ color: 'cyan', fontWeight: 500 }}>
                                + Add repository
                            </span>
                        ),
                    },
                ]}
                placeholder="Select a repository"
                label="Repository"
                fullWidth
                withAsterisk
                value={selectedRepo}
                onChange={(value) => {
                    if (value === 'add-repository') {
                        dispatch(openAddSBHrepository());
                    } else {
                        if(value != selectedRepo){
                            setSelectedRepo(value);
                            setDataPrimarySBH(value);
                            dispatch(openSBHLogin())
                        }
                    }
                }}
            />

            <Space h="xl" />
            <ScrollArea style={{ height: 400 }} type="always">
                <Table highlightOnHover withColumnBorders style={{ minWidth: '100%', tableLayout: 'fixed' }}>
                    <thead>
                        <tr>
                            <th>Display ID</th>
                            <th>Name</th>
                            <th>Version</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.isArray(collections) && collections.map((row) => (
                            <tr
                                key={row.uri}
                                style={{
                                    cursor: 'pointer',
                                    background: selectedRow.uri === row.uri ? '#3b5bdb' : undefined,
                                    color: selectedRow.uri === row.uri ? 'white' : undefined
                                }}
                                onClick={() => setSelectedRow(row)}
                            >
                                <td style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{row.displayId}</td>
                                <td style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{row.name}</td>
                                <td style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{row.version}</td>
                                <td style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{row.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </ScrollArea>

            <Space h="xl" />
            <Group position="center">
                <Button onClick={() => createCollection()} color="blue">Create Collection</Button>
                {dataSBH.some(repo => repo.value === dataPrimarySBH) ? (
                    <Button onClick={() => {SBHLogout(getAuthToken(), selectedRepo); handleLogout()}} color="blue">Logout</Button>
                ) : <></>}
            </Group>
        </>
    )
}