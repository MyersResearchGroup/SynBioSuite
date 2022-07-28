import { Badge, Container, Group, Table, Text } from '@mantine/core'
import React from 'react'
import { useContext } from 'react'
import { getObjectType } from '../../../objectTypes'
import { titleFromFileName, useFile } from '../../../redux/slices/workingDirectorySlice'
import { parameterMap } from './AnalysisForm'
import { PanelContext } from './SimulatorPanel'

export default function ReviewTable() {

    const [panel] = useContext(PanelContext)

    const [inputFile] = useFile(panel.state.componentId)
    const inputFileObjectType = getObjectType(inputFile?.objectType)

    const [environmentFile] = useFile(panel.state.environmentId)
    const environmentFileObjectType = getObjectType(environmentFile?.objectType)

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
                        <td><Text weight={600}>Input</Text></td>
                        <td>
                            <Group position='right'>
                                <Text weight={600}>{titleFromFileName(inputFile?.name)}</Text>
                                {inputFileObjectType?.badgeLabel &&
                                    <Badge>{inputFileObjectType.badgeLabel}</Badge>}
                            </Group>
                        </td>
                    </tr>
                    {panel.state.parameterSource ?
                        Object.entries(panel.state.form).map(([key, value], i) =>
                            <tr key={i}>
                                <td>{parameterMap[key]?.label}</td>
                                <td align='right' >{`${value}`.toUpperCase()}</td>
                            </tr>)
                        :
                        <tr>
                            <td><Text weight={600}>Environment</Text></td>
                            <td>
                                <Group position='right'>
                                    <Text weight={600}>{titleFromFileName(environmentFile?.name)}</Text>
                                    {environmentFileObjectType?.badgeLabel &&
                                        <Badge>{environmentFileObjectType.badgeLabel}</Badge>}
                                </Group>
                            </td>
                        </tr>}
                </tbody>
            </Table>
        </Container>
    )
}
