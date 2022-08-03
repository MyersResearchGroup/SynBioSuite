import { Badge, Container, Group, Table, Text } from '@mantine/core'
import { useContext } from 'react'
import { getObjectType } from '../../../objectTypes'
import { usePanelProperty } from '../../../redux/slices/panelsSlice'
import { titleFromFileName, useFile } from '../../../redux/slices/workingDirectorySlice'
import { parameterMap } from './ParameterForm'
import { PanelContext } from './SimulatorPanel'
import { TabValues as ParameterSources } from './AnalysisWizard'


export default function ReviewTable() {

    const panelId = useContext(PanelContext)

    const formValues = usePanelProperty(panelId, 'formValues')
    const parameterSource = usePanelProperty(panelId, 'parameterSource')

    const inputFileId = usePanelProperty(panelId, 'component')
    const inputFile = useFile(inputFileId)
    const inputFileObjectType = getObjectType(inputFile?.objectType)

    const environmentFileId = usePanelProperty(panelId, 'environment')
    const environmentFile = useFile(environmentFileId)
    const environmentFileObjectType = getObjectType(environmentFile?.objectType)

    const tableContents = () => {
        switch (parameterSource) {
            case ParameterSources.ENVIRONMENT:
                return <tr>
                    <td><Text weight={600}>Environment</Text></td>
                    <td>
                        <Group position='right'>
                            <Text weight={600}>{titleFromFileName(environmentFile?.name)}</Text>
                            {environmentFileObjectType?.badgeLabel &&
                                <Badge>{environmentFileObjectType.badgeLabel}</Badge>}
                        </Group>
                    </td>
                </tr>
            case ParameterSources.PARAMETERS:
                return Object.entries(formValues)
                    .filter(([, value]) => value != null)
                    .map(([key, value], i) =>
                        <tr key={i}>
                            <td>{parameterMap[key]?.label}</td>
                            <td align='right' >{`${value}`.toUpperCase()}</td>
                        </tr>)
        }
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
                    {tableContents()}
                </tbody>
            </Table>
        </Container>
    )
}
