import { useMantineTheme, TextInput, PasswordInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue } from '@mantine/hooks'
import { useContext, useEffect } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { PanelContext } from './CollectionPanel'
import Cookies from 'js-cookie';

export const parameterMap = {
    instance: {
        label: "Flapjack Instance",
        validation: isALink,
        default: "https://"
    },
    email: {
        label: "Flapjack Email",
        validation: nonEmpty,
        default: ""
    },
    password: {
        label: "Flapjack Password",
        validation: nonEmpty,
        default: ""
    }
}


export default function FJLoginForm({ onValidation }) {

    const panelId = useContext(PanelContext)

    // set up state in global store and add default values
    const [formValues, setFormValues] = usePanelProperty(panelId, 'FJFormValues', false)

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
    // Remove the username field from form values if it exists
    useEffect(() => {
        if (form.values.username) {
            form.pop('username');
        }
    }, []);
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
            <TextInput required label={parameterMap.instance.label} placeholder='Insert the URL of Flapjack instance' {...form.getInputProps('instance')} />
            <TextInput required label={parameterMap.email.label} placeholder='Insert the URL of Flapjack email' {...form.getInputProps('email')} />
            <PasswordInput required label={parameterMap.password.label} placeholder='Insert the URL of Flapjack password' {...form.getInputProps('password')} />
        </form>
    )
}

function isALink(value) {
    return !(/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(value)) && "Must be a valid URL"
}

function nonEmpty(value) {
    return !(value != "") && "Required Field"
}