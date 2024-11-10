import { Badge, Container, Group, Table, Text } from '@mantine/core'
import { useContext } from 'react'
import { getObjectType } from '../../../objectTypes'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { titleFromFileName, useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { PanelContext } from './CollectionPanel'


export default function ExperimentalTable() {

    const panelId = useContext(PanelContext)

    const experimentalId = usePanelProperty(panelId, 'experimental', false)
    const experimentalFile = useFile(experimentalId)
    const experimentalFileObjectType = getObjectType(experimentalFile?.objectType)

    const XDCdataID = usePanelProperty(panelId, 'XDCdataID', false)
    const XDCdataFile = useFile(XDCdataID)

    return (
        <Container>
            <Table horizontalSpacing={20}>
                <thead>
                    <tr>
                        <th>
                            <Text weight={600}>Input</Text>
                        </th>
                        <th>
                            <Group position='right'>
                                <Text weight={600}>{titleFromFileName(XDCdataFile?.name)}</Text>
                                {experimentalFileObjectType?.badgeLabel &&
                                    <Badge>{experimentalFileObjectType.badgeLabel}</Badge>}
                            </Group>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td></td>
                        <td></td>
                    </tr>
                </tbody>
            </Table>
        </Container>
    )
}
