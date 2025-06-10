import { Badge, Container, Group, Table, Text } from '@mantine/core'
import { useContext } from 'react'
import { getObjectType } from '../../../objectTypes'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { titleFromFileName, useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { parameterMap } from './AssemblyForm'
import { PanelContext } from './AssemblyPanel'
import { useEffect } from 'react'


export default function AssemblyReviewTable({ onInsertFilesReady }) {

    const panelId = useContext(PanelContext)

    const formValues = usePanelProperty(panelId, 'formValues')

    const vectorFileId = usePanelProperty(panelId, 'backbone')
    const vectorFile = useFile(vectorFileId)
    const vectorFileObjectType = getObjectType(vectorFile?.objectType)

    const insertFileIds = usePanelProperty(panelId, 'inserts')
    const insertFiles = insertFileIds.map(id => useFile(id))

    useEffect(() => {
        if (onInsertFilesReady && insertFiles.every(f => f !== undefined)) {
          onInsertFilesReady(insertFiles)
        }
      }, [insertFiles, onInsertFilesReady])

    const formTableContents = () => {
        return Object.entries(formValues)
            .filter(([, value]) => value != null)
                .map(([key, value], i) =>
                    <tr key={i}>
                        <td>{parameterMap[key]?.label}:</td>
                        <td align='right' >{`${value}`}</td>
                    </tr>)
    }

    const partInsertTableContents = () => {
        return <>
            {insertFiles.map((file, index) => (
                <tr key={index}>
                {index === 0 
                    ? <td><Text weight={600}>Parts</Text></td> 
                    : <td><Text></Text></td>}
                    <td>
                    <Group position='right'>
                        <Text weight={600}>{titleFromFileName(file?.name)}</Text>
                        {getObjectType(file?.objectType)?.badgeLabel &&
                        <Badge>{getObjectType(file?.objectType).badgeLabel}</Badge>}
                    </Group>
                    </td>
                </tr>
            ))}

        </>
    }

    return (
        <Container>
            <Table style = {{width: '50%', margin: 'auto'}} horizontalSpacing = {20}> 
                <thead>
                    <tr>
                        <th></th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><Text weight={600}>Acceptor Backbone:</Text></td>
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
