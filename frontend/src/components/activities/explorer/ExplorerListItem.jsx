import commands from "../../../commands"
import { Menu } from '@mantine/core'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useOpenPanel } from '../../../redux/hooks/panelsHooks'
import { titleFromFileName, useFile } from '../../../redux/hooks/workingDirectoryHooks'
import DragObject from '../../DragObject'
import { getPanelTypeForObject } from '../../../panels'
import store from '../../../redux/store'
import { getObjectType } from "../../../objectTypes"

export default function ExplorerListItem({ fileId, icon }) {

    const file = useFile(fileId)

    const [uploadInfo, setUploadInfo] = useState(null)

    const uploadRevision = useSelector(state => state.workingDirectory.uploadRevision ?? 0)

    useEffect(() => {
        const getUploadInfo = async () => {
            try {
                let jsonFile;
                if (file?.objectType === 'synbio.object-type.study-data' ||
                    file?.objectType === 'synbio.object-type.plate-reader' ||
                    file?.objectType === 'synbio.object-type.experimental-results') {
                    const state = store.getState().workingDirectory
                    const xdcFiles = Object.values(state.entities)
                        .filter(f => f?.name?.toLowerCase().endsWith('.xdc'))
                    for (const xdcHandle of xdcFiles) {
                        try {
                            const xdcFile = await xdcHandle.getFile()
                            const xdcText = await xdcFile.text()
                            const xdc = JSON.parse(xdcText)
                            const metadataMatches =
                                file?.objectType === 'synbio.object-type.study-data' &&
                                (xdc.metadata === file.id ||
                                xdc.metadata?.split('/').pop() === file.name)
                            const plateMatches =
                                file?.objectType === 'synbio.object-type.plate-reader' &&
                                (xdc.plateOutput === file.id ||
                                xdc.plateOutput?.split('/').pop() === file.name)
                            const results = Array.isArray(xdc.results)
                                ? xdc.results
                                : xdc.results
                                    ? [xdc.results]
                                    : []

                            const resultsMatches = results.some(result =>
                                file?.objectType === 'synbio.object-type.experimental-results' &&
                                (result === file.id ||
                                result.split('/').pop() === file.name)
                            )
                            if (!metadataMatches && !plateMatches && !resultsMatches) {
                                continue
                            }
                            if (Array.isArray(xdc.uploads) && xdc.uploads.length > 0) {
                                setUploadInfo(xdc.uploads[xdc.uploads.length - 1])
                                return
                            }
                        } catch (error) {
                            console.warn(`Could not inspect ${xdcHandle.id}:`,error)
                        }
                    }
                    setUploadInfo(null)
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

        if (supportsFileView()) {
            await commands.FileView.execute(fileId)
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

    const supportsFileView = () => {
        const fileName = file.name.toLowerCase()
        if (/\.(xls|xlsx|xlsm)$/i.test(fileName)) {
            return true
        }
        if (/\.json$/i.test(fileName)) {
            return true
        }
        return false
    }

    const supportsFileOpen = () => {
       return uploadInfo
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

    // command list
    let contextMenuCommands = [
        ...(supportsFileView() ? [commands.FileView] : []),
        ...(supportsFileOpen() ? [commands.FileOpen] : []),
        ...(supportsFileUpdate() ? [commands.FileUpdate] : []),
        ...(supportsFileUpload() ? [commands.FileUpload] : []),
        ...(supportsFileDownload() ? [commands.FileDownload] : []),
        commands.FileDelete
    ];

    return (
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
                        onClick={() => cmd.execute(fileId,uploadInfo)}
                    >
                        {cmd.shortTitle}
                    </Menu.Item>
                )}
            </Menu.Dropdown>
        </Menu>
    )
}


const menuStyles = theme => ({
    dropdown: {
        backgroundColor: theme.colors.dark[5]
    }
})
