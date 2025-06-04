import { Badge, Container, Group, Table, Text } from '@mantine/core'
import { useContext } from 'react'
import { getObjectType } from '../../../objectTypes'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { titleFromFileName, useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { PanelContext } from './CollectionPanel'
import * as XLSX from 'xlsx'
import { useState } from 'react'


export default function ExperimentalTable({onInsertFilesReady}) {

    const panelId = useContext(PanelContext)

    const [experimentalId] = usePanelProperty(panelId, 'metadata', false)
    const experimentalFile = useFile(experimentalId)
    const experimentalFileObjectType = getObjectType(experimentalFile?.objectType)

    const [XDCdataID] = usePanelProperty(panelId, 'results', false)
    const XDCdataFile = useFile(XDCdataID)

    const [libraryName, setLibraryName] = useState(null)
    const [description, setDescription] = useState(null)


    //excel information
    const readExcelFile = (eFile) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsArrayBuffer(eFile)
            reader.onload= (event) => {resolve(event.target.result)}
            reader.onerror = (error) =>{reject(error)}
            })
        }

    if (experimentalFile) {
        experimentalFile.getFile().then((realFile) => {
            readExcelFile(realFile).then(arrayBuffer => {
                const workbook = XLSX.read(arrayBuffer, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                let temp_libraryName = null;
                let temp_description = null;

                for (const row of rows) {
                    for (let i = 0; i < row.length; i++) {
                        if (row[i] && typeof row[i] === "string") {
                            const cell = row[i].toLowerCase();
                            if (cell.includes("library name") || cell.includes("collection name")) {
                                temp_libraryName = row[i+1];
                            }
                            if (cell.includes("description")) {
                                temp_description = row[i+1];
                            }
                        }
                        if (temp_libraryName && temp_description) {
                            setLibraryName(temp_libraryName)
                            setDescription(temp_description)
                        }
                    }
                }
            })
        })
    }

    return (
        <Container>
            <Table horizontalSpacing={20}>
            <thead>
                    <tr>
                        <th></th>
                        <th></th>
                    </tr>
            </thead>
                <tbody>
                    {XDCdataFile ? (
                        <tr>
                            <td><Text weight={600}>Results:</Text></td>
                            <td>
                                <Group>
                                    <Text weight={600}>{titleFromFileName(XDCdataFile?.name)}</Text>
                                    {XDCdataFile?.objectType && getObjectType(XDCdataFile.objectType)?.badgeLabel &&
                                        <Badge>{getObjectType(XDCdataFile.objectType).badgeLabel}</Badge>}
                                </Group>
                            </td>
                        </tr>
                    ) : null}
                    <tr>
                        <td><Text weight={600}>Metadata:</Text></td>
                        <td>
                            <Group>
                                <Text weight={600}>{titleFromFileName(experimentalFile?.name)}</Text>
                                {experimentalFileObjectType?.badgeLabel &&
                                    <Badge>{experimentalFileObjectType.badgeLabel}</Badge>}
                            </Group>
                        </td>
                    </tr>
                    <tr>
                        <td><Text weight={600}> Collection Name:</Text></td>
                        {libraryName ? 
                        <td>
                            <Group>
                                <Text weight={600}>{libraryName}</Text>
                            </Group>
                        </td>
                        :
                        <td>
                            <Group>
                                <Text weight={600}>{"Loading..."}</Text>
                            </Group>
                        </td>
                        }
                    </tr>
                    <tr>
                        <td><Text weight={600}> Description:</Text></td>
                        {description ?
                        <td>
                            <Group>
                                <Text weight={600}>{description}</Text>
                            </Group>
                        </td>
                        :
                        <td>
                            <Group>
                                <Text weight={600}>{"Loading..."}</Text>
                            </Group>    
                        </td>                   
                        }
                    </tr>
                </tbody>
            </Table>
        </Container>
    )
}