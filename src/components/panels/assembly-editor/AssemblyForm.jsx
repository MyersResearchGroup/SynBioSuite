import { Button, NumberInput, TextInput, SegmentedControl, Tooltip, Group, Space, Center, Box, useMantineTheme } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue } from '@mantine/hooks'
import { useContext, useEffect } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import InputWrapper from "../simulator/InputWrapper"
import { PanelContext } from './AssemblyPanel'


export const parameterMap = {
    assemblyMethod: {
        label: "Assembly Type",
        default: "MoClo", 
        options: {
            MoClo: 'MoClo',
            // Gibson: 'Gibson', //DEPRECATED in version 2.0.0, 
        }
    },
    restrictionEnzyme: {
        label: "Restriction Enzyme",
        default: "BsaI"
        // validation: resolve on backend
    },
}


export default function AssemblyForm() {

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
            <InputWrapper required label={parameterMap.assemblyMethod.label} >
                <SegmentedControl
                    data={Object.entries(parameterMap.assemblyMethod.options).map(
                        ([value, label]) => ({ label, value })
                    )}
                    color={theme.primaryColor}
                    {...form.getInputProps('assemblyMethod')}
                />
            </InputWrapper>
            <Space h="xl" />
            {form.values.assemblyMethod === 'MoClo' ? (
                 <>  
                    {/* moclo fields */}
                    <Group grow sx={groupStyle}>
                        <TextInput required label={parameterMap.restrictionEnzyme.label} placeholder="" {...form.getInputProps('restrictionEnzyme')} />
                    </Group>
                    <Space h="lg" />
                    <Group grow sx={groupStyle}>
                    </Group>
                    <Space h="lg" />
                    <Group grow mb={40} sx={groupStyle}>
                    </Group>
                </>
            ) : (
                // gibson fields
                <Group grow sx={groupStyle}>
                <TextInput required label="Gibson Parameter 1" {...form.getInputProps('gibsonParam1')} />
                <TextInput required label="Gibson Parameter 2" {...form.getInputProps('gibsonParam2')} />
                </Group>
            )}
        </form>
    )
}

const groupStyle = theme => ({
    alignItems: 'flex-start'
})
