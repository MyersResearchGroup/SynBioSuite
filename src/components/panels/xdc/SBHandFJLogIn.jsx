import { useMantineTheme, TextInput, PasswordInput, Select, Button, Group, Grid, Modal } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue, useDisclosure } from '@mantine/hooks'
import { useContext, useEffect, useState } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { PanelContext } from './CollectionPanel'
import Cookies from 'js-cookie';
import LoginForm from './SynBioHubLogIn'
import axios from 'axios';
import { showNotification } from '@mantine/notifications';

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
    const [SBH_Instance, setSBH_Instance] = usePanelProperty(panelId, 'SBH_Instance', false)
    const [SBH_Token, setSBH_Token] = usePanelProperty(panelId, "SBH_Token", false, false)
    const [formValues, setFormValues] = usePanelProperty(panelId, 'formValues', false)
    const [verifiedToken, setVerifiedToken] = usePanelProperty(panelId, 'verifiedToken', false)
    const [uploadingInfo, setUploadingInfo] = usePanelProperty(panelId, "uploadingInfo", false)

    // set up local variables to store states
    const [SBHButton, setSBHButton] = useState(false);
    const [formValidated, setFormValidated] = useState(false);
    const [removeInstanceSelected, setRemoveInstanceSelected] = useState(false)
    const [removeInstance, setRemoveInstance] = useState();
    
    const [SBH_Instances, setSBH_Instances] = useState(() => {
        const cookieInstances = Cookies.get('SBH_Instances');
        return cookieInstances ? JSON.parse(cookieInstances) : [];
    });

    useEffect(() => {
        Cookies.set('SBH_Instances', JSON.stringify(SBH_Instances), { secure: true, sameSite: 'strict' });
        if (SBH_Instance && !SBH_Instances.some(instance => instance.url === SBH_Instance.url)) {
            setSBH_Instance(null);
        }
    }, [SBH_Instances]);

    useEffect(() => {
        setSBHButton(false);
    }, [SBH_Instance]);

    const handleLogin = async (instance, email, password) => {
        try {
            const response = await axios.post(`${instance}/login`, {
                email: email,
                password: password
            }, {
                headers: {
                    'Accept': 'text/plain',
                    'Content-Type': 'application/json'
                }
            });
            if (response.data) {
                addingInstanceHandler.close()
                setSBH_Token(response.data);
                setSBH_Instances([...(SBH_Instances || []), { url: formValues.instance, token: response.data }]);
                showNotification({
                    title: 'Login Successful',
                    message: 'You have successfully logged in.',
                    color: 'green',
                });
            } else {
                throw new Error('Invalid login response');
            }
        } catch (error) {
            addingInstanceHandler.close()
            showNotification({
                title: 'Login Failed',
                message: 'Invalid credentials or server error.',
                color: 'red',
            });
        }
    };


    return (
        <>
            <Modal opened={addingInstance} onClose={addingInstanceHandler.close} title="Log Into SynBioHub Instance">
                <LoginForm onValidation={validation => setFormValidated(!validation.hasErrors)}/>
                {formValidated ? <><Button style={{ margin: '1rem', float: 'right', marginRight: '0rem' }} onClick={() => {
                    handleLogin(formValues.instance, formValues.email, formValues.password);
                }}>Add Instance</Button></> : <></>}
            </Modal>
            
            <Modal opened={removingInstance} onClose={removingInstanceHandler.close} title="Remove SynBioHub Instance">
                <Select
                    label="SynBioHub Instance"
                    placeholder={"Choose SynBioHub Instance to Remove"}
                    data={SBH_Instances.map(instance => ({ value: instance.token, label: instance.url }))}
                    onChange={(_value) => {
                        setSBHButton(true);
                        setRemoveInstance(_value);
                        setRemoveInstanceSelected(true);}}
                />
                {removeInstanceSelected && <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem', background: 'red' }} onClick={() => {
                    setSBH_Instances(SBH_Instances.filter(instance => instance.token !== removeInstance));
                    setRemoveInstanceSelected(false);
                    removingInstanceHandler.close();
                }}>Confirm Instance to Remove</Button>}
            </Modal>

            <Grid grow gutter="xs">
                <Grid.Col span={10}>
                    <Select
                        label="SynBioHub Instance"
                        value={SBH_Instance ? SBH_Instance.token : null}
                        onChange={(_value) => {
                            setSBHButton(true);
                            setSBH_Instance(SBH_Instances.find(instance => instance.token === _value));
                        }}
                        placeholder={SBH_Instances && SBH_Instances.length > 0 ? "Choose a SynBioHub Instance from the list or add a new instance" : "No SynBioHub instances available, add your own"}
                        data={SBH_Instances.map(instance => ({ value: instance.token, label: instance.url })) || []}
                        disabled={verifiedToken || (SBH_Instances && SBH_Instances.length === 0)}
                    />
                    <Button style={{ margin: '1rem', marginLeft: '0rem'}} onClick={addingInstanceHandler.open} disabled={verifiedToken}>Add SynBioHub Instance</Button>
                    <Button style={{ margin: '1rem' }} onClick={removingInstanceHandler.open} disabled={SBH_Instances && SBH_Instances.length == 0 || verifiedToken}>Remove SynBioHub Instance</Button>
                    {!SBHButton && SBH_Instance && !verifiedToken? <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem', background: 'green' }} onClick={async () => {
                        try {
                            const response = await axios.get(`${SBH_Instance.url}/profile`, {
                                headers: {
                                    'Accept': 'text/plain',
                                    'X-authorization': `${SBH_Instance.token}`
                                }
                            });
                            if (response.status === 200) {
                                setSBHButton(true)
                                showNotification({
                                    title: 'Token Verified',
                                    message: 'The token is valid.',
                                    color: 'green',
                                });
                                setUploadingInfo({
                                    name: response.data.name,
                                    user: response.data.username,
                                    affiliation: response.data.affiliation,
                                    email: response.data.email,
                                    instance: SBH_Instance.url
                                });
                            } else {
                                throw new Error('Invalid token response');
                            }
                        } catch (error) {
                            showNotification({
                                title: 'Token Verification Failed',
                                message: 'Invalid token or server error. Please remove the instance and try logging in again.',
                                color: 'red',
                            });
                        }
                    }} disabled={!SBH_Instance}>Verify Token</Button>:<></>}
                    {SBHButton || verifiedToken ? (!verifiedToken ? 
                    <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem', background: 'green'}} onClick={() => setVerifiedToken(true)}>Confirm Instance</Button>
                    :
                    <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem', background: 'red' }} onClick={() => setVerifiedToken(false)}>Uncofirm Instance</Button>
                    ) : <></>}
                </Grid.Col>




                {/*GUI Representation for Flapjack*/}
                <Grid.Col span={10}>
                    <p style={{ color: 'red', fontSize: '0.8rem' }}>This feature is currently disabled as the flapjack servers are down.</p>
                    <Select
                        label="Flapjack Instance"
                        value={ null}
                        onChange={(_value) => {
                            setSBHButton(true);
                            setSBH_Instance(SBH_Instances.find(instance => instance.token === _value));
                        }}
                        placeholder={SBH_Instances && SBH_Instances.length > 0 ? "Choose a Flapjack Instance from the list or add a new instance" : "No Flapjack instances available, add your own"}
                        data={SBH_Instances.map(instance => ({ value: instance.token, label: instance.url })) || []}
                        disabled={true || verifiedToken || (SBH_Instances && SBH_Instances.length === 0)}
                    />
                    <Button style={{ margin: '1rem', marginLeft: '0rem'}} onClick={addingInstanceHandler.open} disabled={true || verifiedToken}>Add SynBioHub Instance</Button>
                    <Button style={{ margin: '1rem' }} onClick={removingInstanceHandler.open} disabled={true || SBH_Instances && SBH_Instances.length == 0 || verifiedToken}>Remove SynBioHub Instance</Button>
                    {true || (!SBHButton && SBH_Instance && !verifiedToken)? <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem' }} onClick={async () => {
                        try {
                            const response = await axios.get(`${SBH_Instance.url}/profile`, {
                                headers: {
                                    'Accept': 'text/plain',
                                    'X-authorization': `${SBH_Instance.token}`
                                }
                            });
                            if (response.status === 200) {
                                setSBHButton(true)
                                showNotification({
                                    title: 'Token Verified',
                                    message: 'The token is valid.',
                                    color: 'green',
                                });
                            } else {
                                throw new Error('Invalid token response');
                            }
                        } catch (error) {
                            showNotification({
                                title: 'Token Verification Failed',
                                message: 'Invalid token or server error. Please remove the instance and try logging in again.',
                                color: 'red',
                            });
                        }
                    }} disabled={true || !SBH_Instance}>Verify Token</Button>:<></>}
                    {false && (SBHButton || verifiedToken) ? (!verifiedToken ? 
                    <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem', background: 'green'}} onClick={() => setVerifiedToken(true)}>Confirm Instance</Button>
                    :
                    <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem', background: 'red' }} onClick={() => setVerifiedToken(false)}>Uncofirm Instance</Button>
                    ) : <></>}
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
