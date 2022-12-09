import { Button, NumberInput, SegmentedControl, Tooltip, Group, Space, Center, Box, useMantineTheme } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue } from '@mantine/hooks'
import { useContext, useEffect } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import InputWrapper from "./InputWrapper"
import RandomNumberInput from './RandomNumberInput'
import { PanelContext } from './SimulatorPanel'


export const parameterMap = {
    simulationType: {
        label: "Simulation Type",
        default: "ode",
        options: {
            ode: 'ODE',
            hode: 'HODE',
            ssa: 'SSA',
            hssa: 'HSSA',
            dfba: 'DFBA',
            jode: 'JODE',
            jssa: 'JSSA'
        }
    },
    runs: {
        label: "Number of Runs",
        validation: positiveInteger,
        default: 1,
    },
    initialTime: {
        label: "Initial Time",
        validation: nonNegativeNumber,
        default: 0,
    },
    stopTime: {
        label: "Stop Time",
        validation: nonNegativeNumber,
        default: 100,
    },
    outputTime: {
        label: "Output Time",
        validation: nonNegativeNumber,
        default: 0,
    },
    printInterval: {
        label: "Print Interval",
        validation: positiveNumber,
        default: 1,
    },
    minTimeStep: {
        label: "Minimum Time Step",
        validation: nonNegativeNumber,
        default: 0,
    },
    maxTimeStep: {
        label: "Maximum Time Step",
        validation: nonNegativeNumber,
        default: 100000,
    },
    seed: {
        label: "Seed"
    },
}


export default function ParameterForm({ onValidation }) {

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

        // validate
        onValidation?.(form.validate())
    }, [debouncedFormValues])

    return (
        <form>
            <Space h="xl" />
            <InputWrapper required label={parameterMap.simulationType.label} >
                <SegmentedControl
                    data={Object.entries(parameterMap.simulationType.options).map(
                        ([value, label]) => ({ label, value })
                    )}
                    color={theme.primaryColor}
                    {...form.getInputProps('simulationType')}
                />
            </InputWrapper>
            <Space h="xl" />
            <Group grow sx={groupStyle}>
                <NumberInput required label={parameterMap.initialTime.label} placeholder="" {...form.getInputProps('initialTime')} />
                <NumberInput required label={parameterMap.stopTime.label} placeholder="" {...form.getInputProps('stopTime')} />
                <NumberInput required label={parameterMap.outputTime.label} placeholder="" {...form.getInputProps('outputTime')} />
            </Group>
            <Space h="lg" />
            <Group grow sx={groupStyle}>
                <NumberInput required step={0.01} precision={2} label={parameterMap.minTimeStep.label} placeholder="" {...form.getInputProps('minTimeStep')} />
                <NumberInput required label={parameterMap.maxTimeStep.label} placeholder="" {...form.getInputProps('maxTimeStep')} />
            </Group>
            <Space h="lg" />
            {/* <Group grow>
                <NumberInput required step={0.01} precision={9} label="Absolute Error" placeholder="" {...form.getInputProps('abs_err')} />
                <NumberInput required step={0.01} precision={9} label="Relative Error" placeholder="" {...form.getInputProps('rel_err')} />
            </Group>
            <Space h="lg" /> */}
            <Group grow mb={40} sx={groupStyle}>
                <NumberInput required label={parameterMap.runs.label} placeholder="" {...form.getInputProps('runs')} />
                <NumberInput required step={0.01} precision={2} label={parameterMap.printInterval.label} placeholder="" {...form.getInputProps('printInterval')} />
                <NumberInput label={parameterMap.seed.label} placeholder="Leave blank for random" {...form.getInputProps('seed')} />
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