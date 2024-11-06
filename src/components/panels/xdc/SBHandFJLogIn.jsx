import { useMantineTheme, TextInput, PasswordInput, Select, Button, Group, Grid, Modal } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue, useDisclosure } from '@mantine/hooks'
import { useContext, useEffect, useState } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { PanelContext } from './CollectionPanel'
import Cookies from 'js-cookie';
import LoginForm from './SynBioHubLogIn'

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

export default function SBHandFJLogIn() {

    const panelId = useContext(PanelContext)

    // modal handlers
    const [ addingInstance, addingInstanceHandler] = useDisclosure(false);
    const [ removingInstance, removingInstanceHandler] = useDisclosure(false);

    // set up state in global store and add default values
    const [SBHButton, setSBHButton] = usePanelProperty(panelId, 'SBHButton', false, false)
    const [SBH_Instance, setSBH_Instance] = usePanelProperty(panelId, 'SBH_Instance', false)
    const [formValues, setFormValues] = usePanelProperty(panelId, 'formValues', false)
    const [SBHloginSuccess, setSBHLoginSuuccess] = usePanelProperty(panelId, "SBHloginStatus", false, false);
    const [formValidated, setFormValidated] = usePanelProperty(panelId, "formValidated", false, false)
    const [removeInstanceSelected, setRemoveInstanceSelected] = useState(false)
    const [removeInstance, setRemoveInstance] = usePanelProperty(panelId, "removeInstance", false, false)
    
    const [SBH_Instances, setSBH_Instances] = useState(() => {
        const cookieInstances = Cookies.get('SBH_Instances');
        return cookieInstances ? JSON.parse(cookieInstances) : null;
    });

    useEffect(() => {
        Cookies.set('SBH_Instances', JSON.stringify(SBH_Instances));
        if (SBH_Instance && !SBH_Instances.includes(SBH_Instance)) {
            setSBH_Instance(null);
        }
    }, [SBH_Instances]);

    console.log(SBH_Instance)
    return (
        <>
            <Modal opened={addingInstance} onClose={addingInstanceHandler.close} title="Log Into SynBioHub Instance">
                <LoginForm onValidation={validation => setFormValidated(!validation.hasErrors)}/>
                {formValidated ? <><Button style={{ margin: '1rem', float: 'right', marginRight: '0rem' }} onClick={() => {
                    setSBH_Instances([...(SBH_Instances || []), formValues.instance]);
                    addingInstanceHandler.close();
                }}>Add Instance</Button></> : <></>}
            </Modal>
            
            <Modal opened={removingInstance} onClose={removingInstanceHandler.close} title="Remove SynBioHub Instance">
                <Select
                    label="SynBioHub Instance"
                    placeholder={"Choose SynBioHub Instance to Remove"}
                    data={SBH_Instances}
                    onChange={(_value, option) => {
                        setSBHButton(true);
                        setRemoveInstance(_value);
                        setRemoveInstanceSelected(true);}}
                />
                {removeInstanceSelected && <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem', background: 'red' }} onClick={() => {
                    setSBH_Instances(SBH_Instances.filter(instance => instance !== removeInstance));
                    setRemoveInstanceSelected(false);
                    removingInstanceHandler.close();
                }}>Confirm Instance to Remove</Button>}
            </Modal>

            <Grid grow gutter="xs">
                <Grid.Col span={10}>
                    <Select
                        label="SynBioHub Instance"
                        value={SBH_Instance ? SBH_Instance : null}
                        onChange={(_value, option) => {
                            setSBHButton(true);
                            setSBH_Instance(_value);
                        }}
                        placeholder={SBH_Instances && SBH_Instances.length > 0 ? "Choose a SynBioHub Instance from the list or add a new instance" : "No SynBioHub instances available, add your own"}
                        data={SBH_Instances || []}
                        disabled={SBHloginSuccess || (SBH_Instances && SBH_Instances.length === 0)}
                    />
                    <Button style={{ margin: '1rem', marginLeft: '0rem'}} onClick={addingInstanceHandler.open} disabled={SBHloginSuccess}>Add SynBioHub Instance</Button>
                    <Button style={{ margin: '1rem' }} onClick={removingInstanceHandler.open} disabled={SBH_Instances.length == 0 || SBHloginSuccess}>Remove SynBioHub Instance</Button>
                    {SBHButton ? (!SBHloginSuccess ? <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem', background: 'green'}} disabled={!SBH_Instance} onClick={() => setSBHLoginSuuccess(true)}>Login</Button> : <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem', background: 'red' }} disabled={!SBHButton} onClick={() => setSBHLoginSuuccess(false)}>Log Out</Button>) : <></>}
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
