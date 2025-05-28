import { Button, NumberInput, TextInput, SegmentedControl, Tooltip, Group, Space, Center, Box, useMantineTheme } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue } from '@mantine/hooks'
import { useContext, useEffect } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import InputWrapper from "../simulator/InputWrapper"
import { PanelContext } from './BuildPanel'


export const parameterMap = {
    buildMethod: {
        label: "Build Type:",
        default: "Automated", 
        options: {
            Manual: 'Manual (Coming Soon)',
            Automated: 'Automated (Pudu)',
            Cloud: 'Cloud (Coming Soon)',
        }
    }
}


export default function BuildForm() {

    const theme = useMantineTheme()

    const panelId = useContext(PanelContext)

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
        <form>
            <Space h="xl" />
            <InputWrapper required label={parameterMap.buildMethod.label} >
                <SegmentedControl
                    data={Object.entries(parameterMap.buildMethod.options).map(
                        ([value, label]) => ({ label, value })
                    )}
                    color={theme.primaryColor}
                    defaultValue={parameterMap.buildMethod.default}
                    {...form.getInputProps('buildMethod')}
                />
            </InputWrapper>
            <Space h="xl" />
        </form>
    )
}

const groupStyle = theme => ({
    alignItems: 'flex-start'
})