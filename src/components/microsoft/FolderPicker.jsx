import { Button, List, Modal } from '@mantine/core';
import { useState, useEffect } from 'react';
import { FaFolder, FaFolderOpen, FaFile } from 'react-icons/fa';
import { fetchFilesAndFoldersFromOneDrive } from '../../microsoft-utils/fetchFromOneDrive';
import { useDisclosure } from '@mantine/hooks';

export default function OneDrivePickerButton() {
  const [foldersAndFiles, setFoldersAndFiles] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('root');
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [folderHistory, setFolderHistory] = useState(['root']);
  const [opened, { open, close }] = useDisclosure(false);

  // Fetch the oneDrive data when the modal is opened
  useEffect(() => {
    if (opened) {
      fetchAndOpenPicker();
    }
  }, [opened, currentFolderId]);

  const fetchAndOpenPicker = async () => {
    const fetchedItems = await fetchFilesAndFoldersFromOneDrive(currentFolderId);
    setFoldersAndFiles(fetchedItems);
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

  return (
    <div>
      <Button onClick={open}>Open OneDrive Picker</Button>

      <Modal opened={opened} onClose={close} title="Select a folder from your OneDrive" centered>
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
          <Button onClick={close} style={{ alignSelf: 'flex-end' }}>
            Open {selectedFolder ? selectedFolder.name : 'root'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
