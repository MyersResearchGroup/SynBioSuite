import React, { useContext } from 'react'
import { usePanelProperty, usePanel } from '../../../redux/hooks/panelsHooks'
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

    const [assemblyPlanId] = usePanelProperty(panelId, 'assemblyPlan', false)
    const assemblyPlanFile = useFile(assemblyPlanId)
    const assemblyPlanObjectType = getObjectType(assemblyPlanFile?.objectType)

    const [buildId] = usePanelProperty(panelId, 'fileHandle', false)
    const buildFile = useFile(buildId?.id)
    const buildFileObjectType = getObjectType(buildFile?.objectType)

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
                        <td>Assembly Plan:</td>
                        <td align='right'>
                            {assemblyPlanFile && (
                                <Group position='right'>
                                    <Text weight={600}>{titleFromFileName(assemblyPlanFile?.name)}</Text>
                                    {assemblyPlanObjectType?.badgeLabel &&
                                        <Badge>{assemblyPlanObjectType.badgeLabel}</Badge>}
                                </Group>
                            )}
                        </td>
                    </tr>
                    <tr>
                        <td>Build Method:</td>
                        <td align = 'right'>
                            <Text weight={600}>{form.values.buildMethod}</Text>
                        </td>
                    </tr>
                </tbody>
            </Table>
        </Container>
    )
}