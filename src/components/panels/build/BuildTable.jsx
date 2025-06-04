import React, { useContext } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { titleFromFileName, useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { PanelContext } from './BuildPanel'
import { Container, Table, Group, Text, Badge } from '@mantine/core'
import { getObjectType } from '../../../objectTypes'
import BuildForm from './BuildForm'
import { parameterMap } from './BuildForm'
import { FaJoint } from 'react-icons/fa'
import { useForm } from '@mantine/form'
import { useDebouncedValue } from '@mantine/hooks'
import { useEffect } from 'react'

export default function BuildTable({ onInsertFilesReady }) {

    const panelId = useContext(PanelContext)

    const [buildId] = usePanelProperty(panelId, 'metadata', false)
    const buildFile = useFile(buildId)
    const buildFileObjectType = getObjectType(buildFile?.objectType)
    console.log("BuildId: ", buildId)
    console.log("Build File: ", buildFile)
    console.log("panelId: ", panelId)

    // set up state in global store and add default values
    const [formValues, setFormValues] = usePanelProperty(panelId, 'formValues', false)

    // set up form using Mantine hook
    const form = useForm({
        initialValues: formValues || Object.fromEntries(
            Object.entries(parameterMap).map(
                ([param, data]) => [param, data.default]
            )
        ),
    })

    // debounce form values
    const [debouncedFormValues] = useDebouncedValue(form.values, 150)

    // update global store when values change
    useEffect(() => {
        if (JSON.stringify(debouncedFormValues) !== JSON.stringify(formValues))
            setFormValues(debouncedFormValues)

    }, [debouncedFormValues])

    return (
        <Container>
            <Table style = {{width: '50%', margin: 'auto'}} horizontalSpacing = {20}>
                <tbody>
                    <tr></tr>
                    <tr>
                        <td>Build File:</td>
                        <td align='right'>
                            {buildFile && (
                                <Group position='right'>
                                    <Text weight={600}>{titleFromFileName(buildFile?.name)}</Text>
                                    {buildFileObjectType?.badgeLabel &&
                                        <Badge>{buildFileObjectType.badgeLabel}</Badge>}
                                </Group>
                            )}
                        </td>
                    </tr>
                    <tr>
                        <td>Build Method:</td>
                        <td>
                            <Text weight={600}>{form.values.buildMethod}</Text>
                        </td>
                    </tr>
                </tbody>
            </Table>
        </Container>
    )
}