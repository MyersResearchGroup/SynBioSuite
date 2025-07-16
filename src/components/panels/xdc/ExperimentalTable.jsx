import { Badge, Container, Group, Table, Text } from '@mantine/core'
import { useContext } from 'react'
import { getObjectType } from '../../../objectTypes'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { titleFromFileName, useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { PanelContext } from './CollectionPanel'
import * as XLSX from 'xlsx'
import { useState } from 'react'


export default function ExperimentalTable({ onInsertFilesReady, newCollectionname, newDescriptionName }) {

    const panelId = useContext(PanelContext)

    const [experimentalId] = usePanelProperty(panelId, 'metadata', false)
    const experimentalFile = useFile(experimentalId)
    const experimentalFileObjectType = getObjectType(experimentalFile?.objectType)

    const [XDCdataID] = usePanelProperty(panelId, 'results', false)
    const XDCdataFile = useFile(XDCdataID)

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
                        <td>
                            <Group>
                                <Text weight={600}>{newCollectionname}</Text>
                            </Group>
                        </td>
                    </tr>
                    <tr>
                        <td><Text weight={600}> Description:</Text></td>
                        <td>
                            <Group>
                                <Text weight={600}>{newDescriptionName}</Text>
                            </Group>
                        </td>
                    </tr>
                </tbody>
            </Table>
        </Container>
    )
}