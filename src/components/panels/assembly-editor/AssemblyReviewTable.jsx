import { Badge, Container, Group, Table, Text } from '@mantine/core'
import { useContext } from 'react'
import { getObjectType } from '../../../objectTypes'
import { usePanel, usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { titleFromFileName, useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { parameterMap } from './AssemblyForm'
import { PanelContext } from './AssemblyPanel'
import { TabValues as ParameterSources } from './AssemblyWizard'


export default function AssemblyReviewTable() {

    const panelId = useContext(PanelContext)

    const formValues = usePanelProperty(panelId, 'formValues')
    const parameterSource = usePanelProperty(panelId, 'parameterSource')

    const vectorFileId = usePanelProperty(panelId, 'backbone')
    const vectorFile = useFile(vectorFileId)
    const vectorFileObjectType = getObjectType(vectorFile?.objectType)

    const insertFileIds = usePanelProperty(panelId, 'inserts')
    const insertFiles = insertFileIds.map(id => useFile(id))
    const insertFileObjectType = getObjectType(insertFiles[0]?.objectType)
    console.log(insertFileObjectType)

    const environmentFileId = usePanelProperty(panelId, 'environment')
    const environmentFile = useFile(environmentFileId)
    const environmentFileObjectType = getObjectType(environmentFile?.objectType)

    const formTableContents = () => {
        return Object.entries(formValues)
            .filter(([, value]) => value != null)
                .map(([key, value], i) =>
                    <tr key={i}>
                        <td>{parameterMap[key]?.label}</td>
                        <td align='right' >{`${value}`}</td>
                    </tr>)
    }

    const partInsertTableContents = () => {
        return <>
            {insertFiles.map((file, index) => (
                <tr key={index}>
                {index === 0 
                    ? <td><Text weight={900}>Parts:</Text></td> 
                    : <td><Text></Text></td>}
                    <td>
                    <Group position='right'>
                        <Text weight={600}>{titleFromFileName(file?.name)}</Text>
                        {insertFileObjectType?.badgeLabel &&
                        <Badge>{insertFileObjectType.badgeLabel}</Badge>}
                    </Group>
                    </td>
                </tr>
            ))}

        </>
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
                        <td><Text weight={900}>Acceptor Backbone:</Text></td>
                        <td>
                            <Group position='right'>
                                <Text weight={600}>{titleFromFileName(vectorFile?.name)}</Text>
                                {vectorFileObjectType?.badgeLabel &&
                                    <Badge>{vectorFileObjectType.badgeLabel}</Badge>}
                            </Group>
                        </td>
                    </tr>
                    {partInsertTableContents()}
                    {formTableContents()}
                </tbody>
            </Table>
        </Container>
    )
}
