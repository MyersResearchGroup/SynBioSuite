import { Group } from "@mantine/core";
import { AiOutlineImport } from "react-icons/ai";
import { FiUpload } from "react-icons/fi";
import { getPrimaryColor } from "../../../modules/colorScheme";
import { createContext, useState } from "react";
import { classifyFile, ObjectTypes } from "../../../objectTypes";
import { Text } from "@mantine/core";
import { useSelector, useDispatch } from "react-redux";
import { writeToFileHandle } from "../../../redux/hooks/workingDirectoryHooks";
import { useOpenPanel } from "../../../redux/hooks/panelsHooks";
import workingDirectorySlice from "../../../redux/slices/workingDirectorySlice";
import { useLocalStorage } from "@mantine/hooks";
import { showErrorNotification } from "../../../modules/util";
import { upload_resource, upload_sbol } from "../../../API";
import { useUnifiedModal } from "../../../redux/hooks/useUnifiedModal";
import { loadOverlay, closeOverlay } from "../../../redux/slices/loadingOverlay";
import { readStudy } from "../../../modules/util";

export const importedFile = createContext()

async function getAvailableBaseName(objectTypeDir, uploadsDir, baseName, ext, maxAttempts = 1000) {
    let candidate = baseName;
    let counter = 1;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
        let jsonExists = false;
        let fileExists = false;
        try { await objectTypeDir.getFileHandle(`${candidate}.json`); jsonExists = true; } catch {}
        try { await uploadsDir.getFileHandle(`${candidate}${ext}`); fileExists = true; } catch {}
        if (!jsonExists && !fileExists) return candidate;
        candidate = `${baseName} (${counter})`;
        counter++;
    }
    throw new Error(`Unable to find available base name after ${maxAttempts} attempts.`);
}

export default function ImportFile({ onSelect, text, importable, uploadNow, useSubdirectory = false }) {
    const [selectedFile, setSelectedFile] = useState(null)
    const dirName = useSelector(state => state.workingDirectory.directoryHandle)
    const [dataSBH] = useLocalStorage({ key: 'SynbioHub', defaultValue: [] })
    const dispatch = useDispatch()
    const openPanel = useOpenPanel()
    const { workflows } = useUnifiedModal()
    const { actions } = workingDirectorySlice

    async function addFileMetadata(fileHandle) {
        const file = await fileHandle.getFile();
        let directoryHandle = null;

        if (useSubdirectory) {
            directoryHandle = await dirName.getDirectoryHandle(useSubdirectory, { create: false })
                .catch(() => dirName.getDirectoryHandle(useSubdirectory, { create: true }));
        }

        return {
            fileobj: file,
            name: file.name,
            fileHandle: fileHandle,
            directoryHandle,
            objectType: await classifyFile(fileHandle, useSubdirectory)
        };
    }

    async function saveFileToUploads(fileObj, objectType, actualFileName) {
        const subDir = objectType
            ? await dirName.getDirectoryHandle(objectType, { create: true })
            : dirName
        const fileHandle = await subDir.getFileHandle(actualFileName, { create: true });
        const writable = await fileHandle.createWritable();
        const arrayBuffer = await fileObj.arrayBuffer();
        await writable.write(arrayBuffer);
        await writable.close();
        return fileHandle;
    }

    async function createWorkflowJSON(availableBaseName, objectType, actualFileName, filePath, collection, initialUpload) {
        try {
            const directory = objectType
                ? await dirName.getDirectoryHandle(objectType, { create: true })
                : dirName
            const jsonFileName = `${availableBaseName}.json`;
            const jsonFileHandle = await directory.getFileHandle(jsonFileName, { create: true });

            const defaultWorkflow = {
                activeStep: 0,
                file: filePath,
                collection: collection || {},
                uploads: initialUpload ? [initialUpload] : []
            };

            await writeToFileHandle(jsonFileHandle, JSON.stringify(defaultWorkflow));

            const uploadedFileHandle = await directory.getFileHandle(actualFileName, { create: false });
            uploadedFileHandle.id = objectType
                ? `${objectType}/${actualFileName}`
                : actualFileName
            uploadedFileHandle.id = `${objectType}/${actualFileName}`;
            if (objectType === 'resources') {
                uploadedFileHandle.objectType = ObjectTypes.Resources.id;
            } else if (objectType === 'devices') {
                uploadedFileHandle.objectType = ObjectTypes.Devices.id;
            } else if (objectType === 'strains') {
                uploadedFileHandle.objectType = ObjectTypes.Strains.id;
            } else if (objectType === 'sampleDesigns') {
                uploadedFileHandle.objectType = ObjectTypes.SampleDesigns.id;
            } else if (objectType === 'plasmids') {
                uploadedFileHandle.objectType = ObjectTypes.Plasmids.id;
            } else if (objectType === 'assays') {
                uploadedFileHandle.objectType = ObjectTypes.Metadata.id;
            } else {
                uploadedFileHandle.objectType = ObjectTypes.Designs.id;
            }
            dispatch(actions.addFile(uploadedFileHandle));
            //openPanel(jsonFileHandle);
        } catch (err) {
            console.error("Error creating resource workflow JSON:", err);
        }
    }

    async function runImportCollectionWorkflow() {
        const study = await readStudy(dirName);
        return new Promise((resolve) => {
            workflows.importToStudy(resolve, {
                multiSelect: false,
                rootOnly: true,
                selectedRepo: study.registryURL,
            })
        })
    }

    async function runImportAssayWorkflow() {
        const studyData = await readStudy(dirName);
        const selectedRepo = studyData.registryURL || null;
        const expectedEmail = studyData.userEmail || null;
        const selectedCollectionUri = studyData.collectionUri || null;
        const selectedCollectionName = studyData.name || null;
        const selectedCollectionId = studyData.id || null;

        const stored = JSON.parse(localStorage.getItem('SynbioHub') || '[]');
        const repoInfo = stored.find(repo => repo.registryURL === selectedRepo);
        const authToken = repoInfo?.authtoken || null;

        if (selectedRepo && selectedCollectionUri && authToken) {
            return {
                completed: true,
                selectedRepo,
                authToken,
                userInfo: { email: expectedEmail || '' },
                collections: [{
                    uri: selectedCollectionUri,
                    name: selectedCollectionName || selectedCollectionId || selectedCollectionUri,
                    displayId: selectedCollectionId || selectedCollectionName || selectedCollectionUri,
                    selectedRepo,
                    authToken,
                }],
            }
        }
     }

    async function createAssayWorkflowFile(metaDataFile, fileName, modalResult) {
        const assaysDirectory = await dirName.getDirectoryHandle(ObjectTypes.Metadata.subdirectory, { create: true })
        const fileHandle = await assaysDirectory.getFileHandle(fileName + '.xdc', { create: true })
        fileHandle.id = `${ObjectTypes.Metadata.subdirectory}/${fileName}.xdc`
        fileHandle.objectType = ObjectTypes.Metadata.id
        const selectedCollection = modalResult.collections?.[0]
        const workflowData = {
            activeStep: 0,
            metadata: metaDataFile,
            results: null,
            plateOutput: null,
            collection: {
                uri: selectedCollection?.uri || null,
                name: selectedCollection?.name || null,
                displayId: selectedCollection?.displayId || null,
                selectedRepo: modalResult.selectedRepo || null,
                sbh_overwrite: modalResult.sbh_overwrite ?? 0,
                completed: true,
            },
            uploads: [],
        }
        await writeToFileHandle(fileHandle, JSON.stringify(workflowData))
        openPanel(fileHandle)
    }

    const handleClick = async () => {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                id: "import-files",
                types: [],
                multiple: false,
                startIn: 'documents'
            })

            const fileMetadata = await addFileMetadata(fileHandle)
            setSelectedFile(fileMetadata)
            const lastDot = fileMetadata.name.lastIndexOf('.')
            const ext = lastDot >= 0 ? fileMetadata.name.slice(lastDot) : ''
            const baseName = lastDot >= 0 ? fileMetadata.name.slice(0, lastDot) : fileMetadata.name

            if (useSubdirectory=='assays') {
                onSelect?.(fileMetadata)
                const metaDataFile = useSubdirectory + '/' + fileMetadata.name
                const modalResult = await runImportAssayWorkflow()
                if (!modalResult?.completed) {
                    return
                }
                await createAssayWorkflowFile(metaDataFile, baseName, modalResult)
                return
            }
            
            if (uploadNow) {
                let sbmlFile = null
                if (fileMetadata.name.endsWith("_sbol.xml")) {
                    sbmlFile = fileMetadata.name.replace("_sbol.xml","_sbml.xml")
                }

                const objectTypeDir = useSubdirectory
                    ? await dirName.getDirectoryHandle(useSubdirectory, { create: true })
                    : dirName
                const availableBaseName = await getAvailableBaseName(objectTypeDir, objectTypeDir, baseName, ext)
                const actualFileName = `${availableBaseName}${ext}`
                const uploadedFilePath = useSubdirectory
                    ? `${useSubdirectory}/${actualFileName}`
                    : actualFileName
                const importType = useSubdirectory || 'designs'
                
                const modalResult = await runImportCollectionWorkflow()

                if (!modalResult?.completed) {
                    return
                }

                let jsonData
                try {
                  jsonData = await readStudy(dirName);
                } catch (e) {
                  showErrorNotification("Failed to read study file", e.message);
                  return "Failed to read study file.";
                }

                const selectedCollectionUri = jsonData.collectionUri
                const selectedCollectionId = jsonData.id
                const selectedCollectionName = jsonData.name
                const selectedRepo = jsonData.registryURL;
                const authToken = modalResult.authToken
                const registryAPI = dataSBH.find((repo) => repo.registryURL === selectedRepo)?.registryAPI || selectedRepo
                const registryPrefix = dataSBH.find((repo) => repo.registryURL === selectedRepo)?.registryPrefix || selectedRepo
  
                if (!selectedCollectionUri || !selectedRepo || !authToken) {
                    showErrorNotification("Import aborted", "Missing repository, credentials, or collection selection.")
                    return
                }

                const collectionDisplayId = selectedCollectionId
                    || selectedCollectionUri.split('/').slice(-2, -1)[0]
                    || selectedCollectionName
                    || collselectedCollectionUriectionUrl

                const uploadedFile = await saveFileToUploads(fileMetadata.fileobj, useSubdirectory, actualFileName)

                dispatch(loadOverlay())
                let uploadResponse
                try {
                    if (useSubdirectory=='resources' || useSubdirectory=='strains'|| useSubdirectory=='sampleDesigns') {
                        uploadResponse = await upload_resource(
                            uploadedFilePath,
                            registryAPI,
                            registryPrefix,
                            authToken,
                            selectedCollectionUri,
                            dirName,
                            3,
                            importType
                        )
                    } else {
                        uploadResponse = await upload_sbol(
                            uploadedFile,
                            sbmlFile,
                            registryAPI,
                            registryPrefix,
                            authToken,
                            selectedCollectionUri,
                            3,
                            importType
                        );
                    }
                } finally {
                    dispatch(closeOverlay())
                }

                const collectionData = {
                    name: selectedCollectionName || collectionDisplayId,
                    displayId: collectionDisplayId,
                    uri: selectedCollectionUri,
                    selectedRepo,
                    userEmail: modalResult.userInfo?.email || null,
                }

                const initialUpload = {
                    collectionName: collectionData.name,
                    collectionUri: selectedCollectionUri,
                    collectionDisplayId,
                    uri: uploadResponse.subCollectionUrl,
                    file: uploadedFilePath,
                    date: new Date().toLocaleString(undefined, { timeZoneName: 'short' }),
                    selectedRepo,
                    userEmail: modalResult.userInfo?.email || null,
                    type: 'initial',
                }

                await createWorkflowJSON(availableBaseName, useSubdirectory, actualFileName, uploadedFilePath, collectionData, initialUpload)
                return
            } 
            onSelect?.(fileMetadata)

        } catch (err) {
            if (err?.name === "NotFoundError" || err?.name === "AbortError") {
                return; // user canceled
            }
            if (err?.message) {
                showErrorNotification("Upload failed", err.message)
            }
        }
    }
    return (
        <Group sx={groupStyle} onClick={handleClick}>
            <importedFile.Provider value={{ selectedFile, setSelectedFile }}>
                {importable ? <AiOutlineImport /> : <FiUpload />}
                <Text size="sm" sx={textStyle}>
                    {text}
                </Text>
            </importedFile.Provider>
        </Group>
    );
}

const groupStyle = (theme) => ({
    padding: "3px 0 3px 8px",
    borderRadius: 3,
    cursor: "pointer",
    color: getPrimaryColor(theme, 5),
    "&:hover": {
        backgroundColor: theme.colors.dark[5]
    }
});

const textStyle = (theme) => ({
    flexGrow: 1,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    userSelect: "none",
    color: getPrimaryColor(theme, 5),
    fontWeight: 500
});
