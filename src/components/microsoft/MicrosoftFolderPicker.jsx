import { Button, List, Modal, LoadingOverlay } from '@mantine/core';
import { useState, useEffect } from 'react';
import { FaFolder, FaFolderOpen, FaFile } from 'react-icons/fa';
import { fetchFilesAndFoldersFromOneDrive } from '../../microsoft-utils/oneDrive/fetchFromOneDrive';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';

export default function MicrosoftFolderPicker({ buttonName }) {
  const [foldersAndFiles, setFoldersAndFiles] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('root');
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [folderHistory, setFolderHistory] = useState(['root']);
  const [opened, { open, close }] = useDisclosure(false);
  const [oneDriveFolder, setOneDriveFolder] = useLocalStorage({ key: 'one-drive-folder', defaultValue: null });
  const [loading, setLoading] = useState(false);

  // Fetch the oneDrive data when the modal is opened
  useEffect(() => {
    if (opened) {
      fetchAndOpenPicker();
    }
  }, [opened, currentFolderId]);

  const fetchAndOpenPicker = async () => {
    setLoading(true);
    const fetchedItems = await fetchFilesAndFoldersFromOneDrive(currentFolderId);
    setFoldersAndFiles(fetchedItems);
    setLoading(false);
    open();
  };

  // Handle folder selection
  const handleFolderSelect = (folderId, folderName) => {
    console.log('Selected Folder:', folderId, folderName);
    setSelectedFolder({ id: folderId, name: folderName });

    // Update current folder and add to history for navigation
    setCurrentFolderId(folderId);
    setFolderHistory((prevHistory) => [...prevHistory, folderId]);

    // Fetch the new folder contents
    fetchFolderContents(folderId);
  };

  // Handle navigation back to previous folder
  const handleGoBack = () => {
    const previousFolderId = folderHistory[folderHistory.length - 2];
    setCurrentFolderId(previousFolderId);
    setFolderHistory((prevHistory) => prevHistory.slice(0, -1));

    // Fetch parent folder contents
    fetchFolderContents(previousFolderId);

    // Update the selected folder to the parent folder
    const parentFolderName = folderHistory[folderHistory.length - 2];
    setSelectedFolder({ id: parentFolderName, name: parentFolderName });
  };

  // Fetch folder contents based on current folder ID
  const fetchFolderContents = async (folderId) => {
    const fetchedItems = await fetchFilesAndFoldersFromOneDrive(folderId);
    setFoldersAndFiles(fetchedItems);
  };

  const handleOpenSelectedFolder = () => {
    setOneDriveFolder(selectedFolder);
    console.log("Selected OneDrive Folder:", selectedFolder);
    close();
  }

  return (
    <div>
      <Button onClick={open}>{buttonName}</Button>

      <Modal opened={opened} onClose={close} title="Select a folder from your OneDrive" centered>
         <LoadingOverlay visible={loading} overlayOpacity={0.3} />
        {foldersAndFiles.length > 0 && (
          <div>
            <h3>
              <FaFolderOpen style={{ marginRight: '8px' }} />
              {currentFolderId === 'root' ? 'Root' : selectedFolder?.name}
            </h3>
            <List>
              {foldersAndFiles.map((item) => (
                <List.Item
                  key={item.id}
                  onClick={() => item.folder && handleFolderSelect(item.id, item.name)}
                  style={{
                    cursor: item.folder ? 'pointer' : 'not-allowed',
                    padding: '8px 0',
                  }}
                  icon={item.folder ? <FaFolder style={{ marginRight: '8px' }} /> : <FaFile style={{ marginRight: '8px' }} />}
                >
                  {item.name}
                </List.Item>
              ))}
            </List>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          {currentFolderId !== 'root' && (
            <Button onClick={handleGoBack}>Go Back</Button>
          )}
          <Button onClick={handleOpenSelectedFolder} style={{ alignSelf: 'flex-end' }}>
            Open {selectedFolder ? selectedFolder.name : 'root'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
