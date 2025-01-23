import { Button, NumberInput, TextInput, SegmentedControl, Tooltip, Group, Space, Center, Box, useMantineTheme } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue } from '@mantine/hooks'
import { useContext, useEffect } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import InputWrapper from "../simulator/InputWrapper"
// import RandomNumberInput from './RandomNumberInput'
import { PanelContext } from './AssemblyPanel'


export const parameterMap = {
    assemblyMethod: {
        label: "Assembly Type",
        default: "MoClo", 
        options: {
            MoClo: 'MoClo', //no restriction enzyme form options required
            GoldenGate: 'Golden Gate', //
            Gibson: 'Gibson', //who cares/for later
        }
    },
    restrictionEnzyme: {
        label: "Restriction Enzyme",
        default: "BsaI"
        // validation: some type of restriction enzymne db?
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
        validate: Object.fromEntries(
            Object.entries(parameterMap).map(
                ([param, data]) => [param, data.validation]
            )
        ),
    })

    // debounce form values
    const [debouncedFormValues] = useDebouncedValue(form.values, 150)

    // update global store when values change
    useEffect(() => {
        JSON.stringify(debouncedFormValues) != JSON.stringify(formValues) &&
            setFormValues(debouncedFormValues)

        console.log("using effect")

        // validate
        // onValidation?.(form.validate())
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
            <Group grow sx={groupStyle}>
                {/* <NumberInput required label={parameterMap.initialTime.label} placeholder="" {...form.getInputProps('initialTime')} /> */}
                {/* <NumberInput required label={parameterMap.stopTime.label} placeholder="" {...form.getInputProps('stopTime')} /> */}
                <TextInput required label={parameterMap.restrictionEnzyme.label} placeholder="" {...form.getInputProps('restrictionEnzyme')} />
            </Group>
            <Space h="lg" />
            <Group grow sx={groupStyle}>
                <NumberInput required step={0.01} precision={2} label={parameterMap.restrictionEnzyme.label} placeholder="" {...form.getInputProps('restrictionEnzyme')} />
                <NumberInput required label={parameterMap.restrictionEnzyme.label} placeholder="" {...form.getInputProps('restrictionEnzyme')} />
            </Group>
            <Space h="lg" />
            {/* <Group grow>
                <NumberInput required step={0.01} precision={9} label="Absolute Error" placeholder="" {...form.getInputProps('abs_err')} />
                <NumberInput required step={0.01} precision={9} label="Relative Error" placeholder="" {...form.getInputProps('rel_err')} />
            </Group>
            <Space h="lg" /> */}
            <Group grow mb={40} sx={groupStyle}>
                {/* <NumberInput required label={parameterMap.restrictionEnzyme.label} placeholder="" {...form.getInputProps('restrictionEnzyme')} />
                <NumberInput required step={0.01} precision={2} label={parameterMap.restrictionEnzyme.label} placeholder="" {...form.getInputProps('restrictionEnzyme')} />
                <NumberInput label={parameterMap.restrictionEnzyme.label} placeholder="Leave blank for random" {...form.getInputProps('restrictionEnzyme')} /> */}
            </Group>
        </form>
    )
}

const groupStyle = theme => ({
    alignItems: 'flex-start'
})

function nonNegativeInteger(value) {
    return !(Number.isInteger(value) && value >= 0) && "Must be a non-negative integer"
}

function nonNegativeNumber(value) {
    return !(typeof value === "number" && value >= 0) && "Must be a non-negative number"
}

function positiveInteger(value) {
    return !(Number.isInteger(value) && value > 0) && "Must be a positive integer"
}

function positiveNumber(value) {
    return !(typeof value === "number" && value > 0) && "Must be a positive number"
}