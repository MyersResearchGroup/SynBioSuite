import { Badge, Container, Group, Table, Text } from '@mantine/core'
import { useContext } from 'react'
import { getObjectType } from '../../../objectTypes'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { titleFromFileName, useFiles, useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { PanelContext } from './CollectionPanel'
import { useEffect } from 'react'
import { parameterMap } from '../assembly-editor/AssemblyForm'


export default function ExperimentalTable({onInsertFilesReady}) {

    const panelId = useContext(PanelContext)

    const [experimentalId] = usePanelProperty(panelId, 'metadata', false)
    const experimentalFile = useFile(experimentalId)
    const experimentalFileObjectType = getObjectType(experimentalFile?.objectType)

    const [XDCdataID] = usePanelProperty(panelId, 'results', false)
    const XDCdataFile = useFile(XDCdataID)

    const partInserttableOfcontents = () => {

        return <>
            <tr>
                <td><Text weight={600}>Metadata:</Text></td>
                <td>
                    <Group position='right'>
                        <Text weight={600}>{titleFromFileName(experimentalFile?.name)}</Text>
                        {experimentalFileObjectType?.badgeLabel &&
                            <Badge>{experimentalFileObjectType.badgeLabel}</Badge>}
                    </Group>
                </td>
            </tr>
        </>
    }

                                <Text weight = {600}>{XDCdataFile ? 
                                <tr>
                                    <td><Text weight={600}>Results:</Text></td>
                                    <td>
                                        <Group position='right'>
                                            <Text weight={600}>{titleFromFileName(XDCdataFile?.name)}</Text>
                                            {experimentalFileObjectType?.badgeLabel &&
                                                <Badge>{experimentalFileObjectType.badgeLabel}</Badge>}
                                        </Group>
                                    </td>
                                </tr>
                                    : console.log("No XDCdataFile found")}
                                </Text>

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
            </tbody>
            </Table>
        </Container>
    )
}
