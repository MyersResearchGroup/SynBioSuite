import { Button, NumberInput, TextInput, SegmentedControl, Tooltip, Group, Space, Center, Box, useMantineTheme, Select } from '@mantine/core'
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
            Gibson: 'Gibson',
            Loop: 'Loop'
        }
    },
    restrictionEnzyme: {
        label: "Restriction Enzyme",
        default: "Bsa1"
    },
    fusionSite: {
        label: "Fusion Site",
        default: "Automatic"
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

    // Track if collection has been selected
    const [collectionSelected, setCollectionSelected] = usePanelProperty(panelId, 'collectionSelected', false)
    const [collectionLink, setCollectionLink] = usePanelProperty(panelId, 'collectionLink', false)

    return (
        <form>
            <Space h="xl" />
            <InputWrapper required label={parameterMap.assemblyMethod.label} >
                <SegmentedControl
                    data={Object.entries(parameterMap.assemblyMethod.options).map(
                        ([value, label]) => ({ label, value })
                    )}
                    {...form.getInputProps('assemblyMethod')}
                />
            </InputWrapper>
            <Space h="xl" />
            {form.values.assemblyMethod === 'MoClo' ? (
                <Group grow sx={groupStyle}>
                    <TextInput
                        required
                        label={parameterMap.restrictionEnzyme.label}
                        value='Bsa1'
                        disabled
                    />
                </Group>
            ) : form.values.assemblyMethod === 'Gibson' ? (
                <Group grow sx={groupStyle}>
                    <TextInput
                        required
                        label={parameterMap.restrictionEnzyme.label}
                        {...form.getInputProps('restrictionEnzyme')}
                        onChange={event => form.setFieldValue('restrictionEnzyme', event.currentTarget.value)}
                    />
                </Group>
            ) : form.values.assemblyMethod === 'Loop' ? (
                <Group grow sx={groupStyle}>
                    <Select
                        required
                        label={parameterMap.restrictionEnzyme.label}
                        data={[
                            { value: 'Bsa1', label: 'Bsa1' },
                            { value: 'Sap1', label: 'Sap1' },
                        ]}
                        value={form.values.restrictionEnzyme}
                        onChange={value => {
                            if (value === 'Bsa1' || value === 'Sap1') {
                                form.setFieldValue('restrictionEnzyme', value);
                            } else {
                                form.setFieldValue('restrictionEnzyme', 'Bsa1');
                            }
                        }}
                    />
                </Group>
            ) : null}
        </form>
    )
}

const groupStyle = theme => ({
    alignItems: 'flex-start'
})