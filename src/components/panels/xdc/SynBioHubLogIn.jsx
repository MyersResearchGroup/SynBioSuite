import { Button, NumberInput, SegmentedControl, Tooltip, Group, Space, Center, Box, useMantineTheme, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue } from '@mantine/hooks'
import { useContext, useEffect } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { PanelContext } from './CollectionPanel'


export const parameterMap = {
    instance: {
        label: "SynBioHub Instance",
        validation: nonEmpty,
        default: ""
    },
    username: {
        label: "SynBioHub Username",
        validation: nonEmpty,
        default: ""
    },
    password: {
        label: "SynBioHub Password",
        validation: nonEmpty,
        default: ""
    }
}


export default function LoginForm({ onValidation }) {

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
        JSON.stringify(debouncedFormValues) != JSON.stringify(formValues) && setFormValues(debouncedFormValues)

        // validate
        onValidation?.(form.validate())
    }, [debouncedFormValues])

    return (
        <form>
            <TextInput required label={parameterMap.instance.label} placeholder='Insert the URL of SynBioHub instance' {...form.getInputProps('instance')} />
            <TextInput required label={parameterMap.username.label} placeholder='Insert the URL of SynBioHub username' {...form.getInputProps('username')} />
            <TextInput required label={parameterMap.password.label} placeholder='Insert the URL of SynBioHub password' {...form.getInputProps('password')} />
        </form>
    )
}

const groupStyle = theme => ({
    alignItems: 'flex-start'
})

function nonEmpty(value) {
    return !(value != "") && "Required Field"
}

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