import { Button, NumberInput, SegmentedControl, Tooltip, Group, Space, Center, Box } from '@mantine/core'
import { useDebouncedValue, useForm } from '@mantine/hooks'
import { useContext, useEffect } from 'react'
import InputWrapper from "./InputWrapper"
import RandomNumberInput from './RandomNumberInput'
import { PanelContext } from './SimulatorPanel'

export default function AnalysisForm({ onValidation }) {

    const [panel, usePanelState] = useContext(PanelContext)

    // set up state in global store and add default values
    const [formValues, setFormValues] = usePanelState('form')

    // set up form using Mantine hook
    const form = useForm({
        initialValues: formValues || {
            simulationType: "ode",
            initialTime: 0,
            stopTime: 100,
            outputTime: 0,
            minTimeStep: 0,
            maxTimeStep: 100000,
            runs: 1,
            printInterval: 1,
        },
        validationRules: {
            initialTime: validation.nonNegativeInteger.rule,
            stopTime: validation.nonNegativeInteger.rule,
            outputTime: validation.nonNegativeInteger.rule,
            minTimeStep: validation.nonNegativeInteger.rule,
            maxTimeStep: validation.nonNegativeInteger.rule,
            runs: validation.nonNegativeInteger.rule,
            printInterval: validation.nonNegativeInteger.rule,
            seed: validation.nonNegativeInteger.rule,
        },
        errorMessages: {
            initialTime: validation.nonNegativeInteger.message,
            stopTime: validation.nonNegativeInteger.message,
            outputTime: validation.nonNegativeInteger.message,
            minTimeStep: validation.nonNegativeInteger.message,
            maxTimeStep: validation.nonNegativeInteger.message,
            runs: validation.nonNegativeInteger.message,
            printInterval: validation.nonNegativeInteger.message,
            seed: validation.nonNegativeInteger.message,
        }
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


    // when values are submitted
    const handleSubmit = async values => {
        // setAnalysis({ running: true })
        // submitAction()

        // construct FormData for request
        const formData = new FormData()

        // set values from form
        Object.entries(values).map(([key, val]) => {
            if (key != 'environment' && key != 'component')
                formData.set(key, '' + val)
        })

        // make request
        // TO DO: don't hard code endpoint -- add to env variables
        // fetch('http://localhost:3000/conversion-analysis', {
        //     method: 'POST',
        //     body: formData
        // })
        //     .then(response => response.json())
        //     .then(response => {
        //         // take note of document to watch
        //         response.createdDocument && setAnalysis({ remoteDocument: response.createdDocument })
        //     })
        //     .catch(err => postError('Failed to reach API'))
    }

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <Space h="xl" />
            <InputWrapper required label={parameterMap.simulationType.label} >
                <SegmentedControl
                    data={
                        ['ODE', 'HODE', 'SSA', 'HSSA', 'DFBA', 'JODE', 'JSSA'].map(item => ({
                            label: item,
                            value: item.toLowerCase()
                        }))
                    }
                    // color="canvasBlue"
                    color="blue"
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
                <NumberInput required label={parameterMap.minTimeStep.label} placeholder="" {...form.getInputProps('minTimeStep')} />
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
                <NumberInput required label={parameterMap.printInterval.label} placeholder="" {...form.getInputProps('printInterval')} />
                <Box>
                    <RandomNumberInput label={parameterMap.seed.label} {...form.getInputProps('seed')} digits={7} />
                </Box>
            </Group>
        </form>
    )
}

const groupStyle = theme => ({
    alignItems: 'flex-start'
})


export const parameterMap = {
    simulationType: {
        label: "Simulation Type"
    },
    runs: {
        label: "Number of Runs"
    },
    initialTime: {
        label: "Initial Time"
    },
    stopTime: {
        label: "Stop Time"
    },
    outputTime: {
        label: "Output Time"
    },
    printInterval: {
        label: "Print Interval"
    },
    minTimeStep: {
        label: "Minimum Time Step"
    },
    maxTimeStep: {
        label: "Maximum Time Step"
    },
    seed: {
        label: "Seed"
    },
}

const validation = {
    nonNegativeInteger: {
        rule: value => Number.isInteger(value) && value >= 0,
        message: "Must be a non-negative integer"
    }
}