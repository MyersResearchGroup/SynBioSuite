import { useMantineTheme, TextInput, PasswordInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue } from '@mantine/hooks'
import { useContext, useEffect } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { PanelContext } from './CollectionPanel'
import Cookies from 'js-cookie';

export const parameterMap = {
    instance: {
        label: "SynBioHub Instance",
        validation: isALink,
        default: "https://"
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

    // Example Cookie Handler -- Placeholder for code required to handle login
    /*
    // Read a cookie value
    let login = Cookies.get('SBH_Login');

    // Check if a cookie exists
    if (!login) {
        // Create a cookie with default values if it doesn't exist
        //login = [{instance:"SBH_Instance",username: "Username",password: "Password",loginStatus: false}];
        //Cookies.set('SBH_Login', JSON.stringify(login));
        console.log('Created new SBH_Login cookie with default values');
    } else {
        console.log('User is authenticated');
    }


    // Get all cookies
    const allCookies = Cookies.get();
    console.log(allCookies);
    */

    const panelId = useContext(PanelContext)

    // set up state in global store and add default values
    const [formValues, setFormValues] = usePanelProperty(panelId, 'formValues', false)
    const [loginSuccess, setLoginSuucces] = usePanelProperty(panelId, "loginStatus", false, false);

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
            <PasswordInput required label={parameterMap.password.label} placeholder='Insert the URL of SynBioHub password' {...form.getInputProps('password')} />
        </form>
    )
}

function isALink(value) {
    return !(/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(value)) && "Must be a valid URL"
}

function nonEmpty(value) {
    return !(value != "") && "Required Field"
}