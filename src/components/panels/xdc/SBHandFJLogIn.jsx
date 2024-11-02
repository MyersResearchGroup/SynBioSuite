import { useMantineTheme, TextInput, PasswordInput, Select, Button, Group, Grid } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue, useDisclosure } from '@mantine/hooks'
import { useContext, useEffect, useState } from 'react'
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

export default function SBHandFJLogIn({ onValidation }) {

    const panelId = useContext(PanelContext)

    // set up state in global store and add default values
    const [SBHButton, setSBHButton] = usePanelProperty(panelId, 'SBHButton', false, false)
    const [SBH_Instance, setSBH_Instance] = usePanelProperty(panelId, 'SBH_Instance', false)
    const [formValues, setFormValues] = usePanelProperty(panelId, 'formValues', false)
    const [SBHloginSuccess, setSBHLoginSuuccess] = usePanelProperty(panelId, "SBHloginStatus", false, false);
    
    const [SBH_Instances, setSBH_Instances] = useState([
        'https://synbiohub1.colorado.edu','https://synbiohub2.colorado.edu','https://synbiohub3.colorado.edu','https://synbiohub4.colorado.edu'
    ])

    console.log(SBH_Instance)
    return (
        <>
            <Grid grow gutter="xs">
                <Grid.Col span={10}>
                    <Select
                        label="SynBioHub Instance"
                        value={SBH_Instance ? SBH_Instance : null}
                        onChange={(_value, option) => {
                            setSBHButton(true);
                            setSBH_Instance(_value);
                        }}
                        placeholder={"Logged into:"}
                        data={SBH_Instances}
                        disabled={SBHloginSuccess}
                    />
                    <Button style={{ margin: '1rem', marginLeft: '0rem'}} onClick={() => console.log('Add SynBioHub Instance')}>Add SynBioHub Instance</Button>
                    <Button style={{ margin: '1rem' }} onClick={() => console.log('Remove SynBioHub Instance')}>Remove SynBioHub Instance</Button>
                    {!SBHloginSuccess ? <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem' }} disabled={!SBHButton} onClick={() => setSBHLoginSuuccess(true)}>Login</Button> : <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem' }} disabled={!SBHButton} onClick={() => setSBHLoginSuuccess(false)}>Log Out</Button>}
                </Grid.Col>
            </Grid>
        </>
    )
}

function isALink(value) {
    return !(/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(value)) && "Must be a valid URL"
}

function nonEmpty(value) {
    return !(value != "") && "Required Field"
}
