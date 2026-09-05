import commands from "../../../commands"
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useOpenPanel } from '../../../redux/hooks/panelsHooks'
import { titleFromFileName, useFile } from '../../../redux/hooks/workingDirectoryHooks'
import DragObject from '../../DragObject'
import { getPanelTypeForObject } from '../../../panels'
import store from '../../../redux/store'
import { ObjectTypes, getObjectType } from "../../../objectTypes"
import { Button, Menu, Modal, TextInput } from '@mantine/core'

export default function ExplorerListItem({ fileId, icon }) {

    const file = useFile(fileId)

    const [uploadInfo, setUploadInfo] = useState(null)
    const [fileInUse, setFileInUse] = useState(null)

    const uploadRevision = useSelector(state => state.workingDirectory.uploadRevision ?? 0)

    const [renameOpen, setRenameOpen] = useState(false)
    const [newName, setNewName] = useState('')
 
    const getRenameParts = fileName => {
        const sbolMatch = fileName.match(/^(.*)(_sbol)(\.[^.]+)$/i)
        if (sbolMatch) {
            return {
                editable: sbolMatch[1],
                suffix: sbolMatch[2] + sbolMatch[3]
            }
        }
        const dot = fileName.lastIndexOf('.')
        if (dot >= 0) {
            return {
                editable: fileName.slice(0, dot),
                suffix: fileName.slice(dot)
            }
        }
        return {
            editable: fileName,
            suffix: ''
        }
    }

    const { suffix } = getRenameParts(file.name)

    useEffect(() => {
        const getUploadInfo = async () => {
            try {
                setFileInUse(false)
                let jsonFile;
                if (file?.objectType === 'synbio.object-type.study-data' ||
                    file?.objectType === 'synbio.object-type.plate-reader' ||
                    file?.objectType === 'synbio.object-type.experimental-results') {
                    const state = store.getState().workingDirectory
                    const assaysDir = await state.directoryHandle.getDirectoryHandle(ObjectTypes.Metadata.subdirectory)
                    const xdcFiles = []
                    for await (const entry of assaysDir.values()) {
                        if (entry.kind === 'file' && /\.xdc$/i.test(entry.name)) {
                            xdcFiles.push(entry)
                        }
                    }
                    setUploadInfo(null)
                    for (const xdcHandle of xdcFiles) {
                        try {
                            const xdcFile = await xdcHandle.getFile()
                            const xdc = JSON.parse(await xdcFile.text())
                            let plateMatches =
                                file?.objectType === 'synbio.object-type.plate-reader' &&
                                    (xdc.plateOutput === file.id || xdc.plateOutput?.split('/').pop() === file.name)
                            let results = Array.isArray(xdc.results)
                                ? xdc.results
                                : xdc.results
                                    ? [xdc.results]
                                    : []
                            let resultsMatches =
                                file?.objectType === 'synbio.object-type.experimental-results' &&
                                results.some(result =>
                                    result === file.id ||
                                    result?.split('/').pop() === file.name
                                )
                            if (plateMatches || resultsMatches) {
                                setFileInUse(true)
                            }
                            if (Array.isArray(xdc.uploads) && xdc.uploads.length > 0) {
                                const upload = xdc.uploads[xdc.uploads.length - 1]
                                let metadataMatches =
                                    file?.objectType === 'synbio.object-type.study-data' &&
                                    (upload.file === file.id ||
                                    upload.file?.split('/').pop() === file.name)
                                plateMatches =
                                    file?.objectType === 'synbio.object-type.plate-reader' &&
                                    (upload.plateOutput === file.id ||
                                    upload.plateOutput?.split('/').pop() === file.name)
                                results = Array.isArray(upload.results)
                                    ? upload.results
                                    : upload.results
                                        ? [upload.results]
                                        : []
                                resultsMatches = results.some(result =>
                                    file?.objectType === 'synbio.object-type.experimental-results' &&
                                    (result === file.id ||
                                    result.split('/').pop() === file.name)
                                )
                                if (metadataMatches || plateMatches || resultsMatches) {
                                    setUploadInfo(xdc.uploads[xdc.uploads.length - 1])
                                }
                            } 
                        } catch (error) {
                            console.warn(`Could not inspect ${xdcHandle.id}:`,error)
                        }
                    }
                    return
                } else if (file?.name?.toLowerCase().endsWith('.json')||
                    file?.name?.toLowerCase().endsWith('.xdc')) {
                    jsonFile = await file.getFile();
                } else if (file?.name?.toLowerCase().endsWith('.xml')||
                    file?.name?.toLowerCase().endsWith('.xlsm')) {
                    let jsonPath
                    if (file?.name?.toLowerCase().endsWith('_sbml.xml')) {
                        jsonPath = file.id.replace(/\_sbml.xml$/i, '_sbol.json');
                    } else if (file?.name?.toLowerCase().endsWith('.xml')) {
                        jsonPath = file.id.replace(/\.xml$/i, '.json');
                    } else {
                        jsonPath = file.id.replace(/\.xlsm$/i, '.json');
                    }
                    const parts = jsonPath.split('/');
                    const fileName = parts.pop();
                    const rootHandle =
                        store.getState().workingDirectory.directoryHandle;
                    let currentDir = rootHandle;
                    for (const part of parts) {
                        currentDir = await currentDir.getDirectoryHandle(part);
                    }
                    const jsonHandle =
                        await currentDir.getFileHandle(fileName);
                    jsonFile = await jsonHandle.getFile();
                } else {
                    setUploadInfo(null);
                    return;
                }
                const jsonText = await jsonFile.text();
                const json = JSON.parse(jsonText);
                if (Array.isArray(json.uploads) && json.uploads.length > 0) {
                    setUploadInfo(json.uploads[json.uploads.length - 1]);
                } else {
                    setUploadInfo(null);
                }
            } catch (error) {
                setUploadInfo(null);
            }
        };
        getUploadInfo();
    }, [file?.id, file?.name, uploadRevision]);

    // handle opening of file
    const openPanel = useOpenPanel()

    const handleOpenFile = async () => {
        const hasWorkflowPanel = !!getPanelTypeForObject(file)
        if (hasWorkflowPanel) {
            openPanel(file)
            return
        }

        if (supportsFileOpen()) {
            await commands.FileOpen.execute(fileId)
            return
        }
    }

    // context menu states
    const [contextMenuOpen, setContextMenuOpen] = useState(false)

    // right click handler
    const handleRightClick = event => {
        event.preventDefault()
        setContextMenuOpen(true)
    }

    const supportsFileOpen = () => {
        const fileName = file.name.toLowerCase()
        if (/\.(xls|xlsx|xlsm)$/i.test(fileName)) {
            return true
        }
        if (/\.json$/i.test(fileName)) {
            return true
        }
        return false
    }

    const supportsFileView = () => {
       return uploadInfo
    }

    const supportsFileDelete = () => {
       return !uploadInfo && !fileInUse
    }

    const supportsFileUpdate = () => {
       return getObjectType(file?.objectType)?.updateable === true
    }

    const supportsFileUpload = () => {
       return getObjectType(file?.objectType)?.uploadable === true
    }

    const supportsFileDownload = () => {
        return true
    }

    const supportsFileRename = () => {
        return !/_sbml\.xml$/i.test(file.name) && !fileInUse
    }

    // command list
    let contextMenuCommands = [
        ...(supportsFileOpen() ? [commands.FileOpen] : []),
        ...(supportsFileView() ? [commands.FileView] : []),
        ...(supportsFileUpdate() ? [commands.FileUpdate] : []),
        ...(supportsFileUpload() ? [commands.FileUpload] : []),
        ...(supportsFileDownload() ? [commands.FileDownload] : []),
        ...(supportsFileRename() ? [commands.FileRename] : []),
        ...(supportsFileDelete() ? [commands.FileDelete] : []),
    ];

    return (
        <>
            <Menu
                shadow="md"
                width={200}
                trigger=""
                opened={contextMenuOpen}
                onChange={setContextMenuOpen}
                withArrow={true}
                styles={menuStyles}
            >
                <Menu.Target>
                    {/* have to wrap this in a div so it can add a ref */}
                    <div>
                        <DragObject
                            title={titleFromFileName(file.name)}
                            fileId={fileId}
                            type={file.objectType}
                            icon={icon}
                            uploadInfo={uploadInfo}
                            onDoubleClick={handleOpenFile}
                            onContextMenu={handleRightClick}
                        />
                    </div>
                </Menu.Target>

                <Menu.Dropdown>
                    {contextMenuCommands.map(cmd =>
                        <Menu.Item
                            key={cmd.id}
                            color={cmd.color}
                            icon={cmd.icon}
                            onClick={() => {
                                if (cmd === commands.FileRename) {
                                    const { editable } = getRenameParts(file.name)
                                    setNewName(editable)
                                    setRenameOpen(true)
                                } else {
                                    cmd.execute(fileId, uploadInfo)
                                }
                            }}
                        >
                            {cmd.shortTitle}
                        </Menu.Item>
                    )}
                </Menu.Dropdown>
            </Menu>
            <Modal
                opened={renameOpen}
                onClose={() => setRenameOpen(false)}
                title="Rename File"
            >
                <TextInput
                    label="File name"
                    value={newName}
                    onChange={event => setNewName(event.currentTarget.value)}
                    rightSection={suffix}
                    rightSectionWidth={suffix.length * 9 + 15}
                    autoFocus
                />
                <Button
                    mt="md"
                    onClick={async () => {
                        const { suffix } = getRenameParts(file.name)
                        await commands.FileRename.execute(fileId,newName + suffix)
                        setRenameOpen(false)
                    }}
                >
                    Rename
                </Button>
            </Modal>
        </>
    )
}


const menuStyles = theme => ({
    dropdown: {
        backgroundColor: theme.colors.dark[5]
    }
})
