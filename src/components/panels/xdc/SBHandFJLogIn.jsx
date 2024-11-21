import { useMantineTheme, TextInput, PasswordInput, Select, Button, Group, Grid, Modal } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue, useDisclosure } from '@mantine/hooks'
import { useContext, useEffect, useState } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { PanelContext } from './CollectionPanel'
import Cookies from 'js-cookie';
import axios from 'axios';
import { showNotification } from '@mantine/notifications';
import SBHLoginForm from './SynBioHubLogIn'
import FJLoginForm from './FlapjackLogIn'

export default function SBHandFJLogIn() {

    const panelId = useContext(PanelContext)

    const [verifiedTokens, setVerifiedTokens] = usePanelProperty(panelId, 'verifiedToken', false);

    const [experimentalId, setExperimentalId] = usePanelProperty(panelId, 'experimental', false)
    const experimentalFile = useFile(experimentalId)

    const [XDCdataID, setXDCDataID] = usePanelProperty(panelId, 'XDCdataID', false)
    const xDCdataFile = useFile(XDCdataID)

    // modal handlers
    const [ addingSBHInstance, addingSBHInstanceHandler] = useDisclosure(false);
    const [ removingSBHInstance, removingSBHInstanceHandler] = useDisclosure(false);

    // set up state in global store and add default values
    const [SBH_Instance, setSBH_Instance] = usePanelProperty(panelId, 'SBH_Instance', false)
    const [SBH_Token, setSBH_Token] = usePanelProperty(panelId, "SBH_Token", false, false)
    const [SBHFormValues, setSBHFormValues] = usePanelProperty(panelId, 'SBHFormValues', false)
    const [SBHverifiedToken, setSBHVerifiedToken] = usePanelProperty(panelId, 'SBHverifiedToken', false, false)
    const [SBHUploadingInfo, setSBHUploadingInfo] = usePanelProperty(panelId, "SBHUploadingInfo", false)

    // set up local variables to store states
    const [SBHButton, setSBHButton] = useState(false);
    const [SBHFormValidated, setSBHFormValidated] = useState(false);
    const [removeSBHInstanceSelected, setSBHRemoveInstanceSelected] = useState(false)
    const [removeSBHInstance, setSBHRemoveInstance] = useState();
    
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

    const SBHHandleLogin = async (instance, email, password) => {
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
                addingSBHInstanceHandler.close()
                setSBH_Token(response.data);
                setSBH_Instances([...(SBH_Instances || []), { url: SBHFormValues.instance, token: response.data }]);
                showNotification({
                    title: 'Login Successful',
                    message: 'You have successfully logged in.',
                    color: 'green',
                });
                const uploadResponse = await axios.post('http://127.0.0.1:5000/upload_sbs', {
                    Metadata: xDCdataFile,
                    AuthToken: SBH_Token,
                    Params: {"fj_url": "localhost:8000", "fj_user": "Gonza10V", "fj_pass": "010101", "sbh_url": "https://synbiohub.colorado.edu", "sbh_user": "Gonza10V", "sbh_pass": "010101", "sbh_collec": "xdc_sbs_test_uploader_file", "fj_overwrite": false, "sbh_overwrite": false}
                }
                , {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                console.log(uploadResponse);
            } else {
                console.log(error);
                throw new Error('Invalid login response');
            }
        } catch (error) {
            addingSBHInstanceHandler.close()
            showNotification({
                title: 'Login Failed',
                message: 'Invalid credentials or server error.',
                color: 'red',
            });
        }
    };

    // modal handlers
    const [ addingFJInstance, addingFJInstanceHandler] = useDisclosure(false);
    const [ removingFJInstance, removingFJInstanceHandler] = useDisclosure(false);

    // set up state in global store and add default values
    const [FJ_Instance, setFJ_Instance] = usePanelProperty(panelId, 'FJ_Instance', false)
    const [FJ_Token, setFJ_Token] = usePanelProperty(panelId, "FJ_Token", false, false)
    const [FJFormValues, setFJFormValues] = usePanelProperty(panelId, 'FJFormValues', false)
    const [FJverifiedToken, setFJVerifiedToken] = usePanelProperty(panelId, 'FJVerifiedToken', false, false)
    const [FJUploadingInfo, setFJUploadingInfo] = usePanelProperty(panelId, "FJUploadingInfo", false)

    // set up local variables to store states
    const [FJButton, setFJButton] = useState(false);
    const [FJFormValidated, setFJFormValidated] = useState(false);
    const [removeFJInstanceSelected, setFJRemoveInstanceSelected] = useState(false)
    const [removeFJInstance, setFJRemoveInstance] = useState();
    
    const [FJ_Instances, setFJ_Instances] = useState(() => {
        const cookieInstances = Cookies.get('FJ_Instances');
        return cookieInstances ? JSON.parse(cookieInstances) : [];
    });

    useEffect(() => {
        Cookies.set('FJ_Instances', JSON.stringify(FJ_Instances), { secure: true, sameSite: 'strict' });
        if (FJ_Instance && !FJ_Instances.some(instance => instance.url === FJ_Instance.url)) {
            setFJ_Instance(null);
        }
    }, [FJ_Instances]);

    useEffect(() => {
        setFJButton(false);
    }, [FJ_Instance]);

    const FJHandleLogin = async (instance, email, password) => {
        try {
            //Flapjack login to be implemented once Flapjack is up and running

            /*const response = await axios.post(`${instance}/login`, {
                email: email,
                password: password
            }, {
                headers: {
                    'Accept': 'text/plain',
                    'Content-Type': 'application/json'
                }
            });
            if (response.data) {
                addingFJInstanceHandler.close()
                setFJ_Token(response.data);
                setFJ_Instances([...(FJ_Instances || []), { url: FJFormValues.instance, token: response.data }]);
                showNotification({
                    title: 'Login Successful',
                    message: 'You have successfully logged in.',
                    color: 'green',
                });
            } else {
                throw new Error('Invalid login response');
            }*/
            addingFJInstanceHandler.close()
            setFJ_Token('A fake token');
            setFJ_Instances([...(FJ_Instances || []), { url: FJFormValues.instance, token: 'A fake token' }]);
            showNotification({
                title: 'Login Successful',
                message: 'You have successfully logged in.',
                color: 'green',
            });
        } catch (error) {
            addingFJInstanceHandler.close()
            showNotification({
                title: 'Login Failed',
                message: 'Invalid credentials or server error.',
                color: 'red',
            });
        }
    };

    useEffect(() => {
        setVerifiedTokens(SBHverifiedToken && FJverifiedToken);
    }, [SBHverifiedToken, FJverifiedToken]);

    return (
        <>
            <Modal opened={addingSBHInstance} onClose={addingSBHInstanceHandler.close} title="Log Into SynBioHub Instance">
                <SBHLoginForm onValidation={validation => setSBHFormValidated(!validation.hasErrors)}/>
                {SBHFormValidated ? <><Button style={{ margin: '1rem', float: 'right', marginRight: '0rem' }} onClick={() => {
                    SBHHandleLogin(SBHFormValues.instance, SBHFormValues.email, SBHFormValues.password);
                }}>Add Instance</Button></> : <></>}
            </Modal>
            
            <Modal opened={removingSBHInstance} onClose={removingSBHInstanceHandler.close} title="Remove SynBioHub Instance">
                <Select
                    label="SynBioHub Instance"
                    placeholder={"Choose SynBioHub Instance to Remove"}
                    data={SBH_Instances.map(instance => ({ value: instance.token, label: instance.url }))}
                    onChange={(_value) => {
                        setSBHButton(true);
                        setSBHRemoveInstance(_value);
                        setSBHRemoveInstanceSelected(true);}}
                />
                {removeSBHInstanceSelected && <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem', background: 'red' }} onClick={() => {
                    setSBH_Instances(SBH_Instances.filter(instance => instance.token !== removeSBHInstance));
                    setSBHRemoveInstanceSelected(false);
                    removingSBHInstanceHandler.close();
                }}>Confirm Instance to Remove</Button>}
            </Modal>

            {/*Modal Representation for Flapjack*/}
            <Modal opened={addingFJInstance} onClose={addingFJInstanceHandler.close} title="Log Into Flapjack Instance">
                <FJLoginForm onValidation={validation => setFJFormValidated(!validation.hasErrors)}/>
                {FJFormValidated ? <><Button style={{ margin: '1rem', float: 'right', marginRight: '0rem' }} onClick={() => {
                    FJHandleLogin(FJFormValues.instance, FJFormValues.email, FJFormValues.password);
                }}>Add Instance</Button></> : <></>}
            </Modal>
            
            <Modal opened={removingFJInstance} onClose={removingFJInstanceHandler.close} title="Remove Flapjack Instance">
                <Select
                    label="Flapjack Instance"
                    placeholder={"Choose Flapjack Instance to Remove"}
                    data={FJ_Instances.map(instance => ({ value: instance.token, label: instance.url }))}
                    onChange={(_value) => {
                        setFJButton(true);
                        setFJRemoveInstance(_value);
                        setFJRemoveInstanceSelected(true);}}
                />
                {removeFJInstanceSelected && <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem', background: 'red' }} onClick={() => {
                    setFJ_Instances(FJ_Instances.filter(instance => instance.token !== removeFJInstance));
                    setFJRemoveInstanceSelected(false);
                    removingFJInstanceHandler.close();
                }}>Confirm Instance to Remove</Button>}
            </Modal>



            <Grid>
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
                        disabled={SBHverifiedToken || (SBH_Instances && SBH_Instances.length === 0)}
                    />
                    <Button style={{ margin: '1rem', marginLeft: '0rem'}} onClick={addingSBHInstanceHandler.open} disabled={SBHverifiedToken}>Add SynBioHub Instance</Button>
                    <Button style={{ margin: '1rem' }} onClick={removingSBHInstanceHandler.open} disabled={SBH_Instances && SBH_Instances.length == 0 || SBHverifiedToken}>Remove SynBioHub Instance</Button>
                    {SBH_Instance ? (!SBHverifiedToken ? <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem', background: 'green' }} onClick={async () => {
                        try {
                            const response = await axios.get(`${SBH_Instance.url}/profile`, {
                                headers: {
                                    'Accept': 'text/plain',
                                    'X-authorization': `${SBH_Instance.token}`
                                }
                            });
                            if (response.status === 200) {
                                showNotification({
                                    title: 'Instance Confirmed',
                                    message: 'Instance selection was accepted.',
                                    color: 'green',
                                });
                                setSBHUploadingInfo({
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
                                message: 'Login to SynBioHub failed. Please remove the instance and try logging in again.',
                                color: 'red',
                            });
                        };
                    setSBHVerifiedToken(true);}} disabled={!SBH_Instance}>Confirm Instance</Button>
                    :
                    <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem', background: 'red' }} onClick={() => setSBHVerifiedToken(false)}>Unconfirm Instance</Button>): <></>}
                </Grid.Col>

                <Grid.Col span={10}>
                    <Select
                        label="Flapjack Instance"
                        value={FJ_Instance ? FJ_Instance.token : null}
                        onChange={(_value) => {
                            setFJButton(true);
                            setFJ_Instance(FJ_Instances.find(instance => instance.token === _value));
                        }}
                        placeholder={FJ_Instances && FJ_Instances.length > 0 ? "Choose a Flapjack Instance from the list or add a new instance" : "No Flapjack instances available, add your own"}
                        data={FJ_Instances.map(instance => ({ value: instance.token, label: instance.url })) || []}
                        disabled={FJverifiedToken || (FJ_Instances && FJ_Instances.length === 0)}
                    />
                    <Button style={{ margin: '1rem', marginLeft: '0rem'}} onClick={addingFJInstanceHandler.open} disabled={FJverifiedToken}>Add Flapjack Instance</Button>
                    <Button style={{ margin: '1rem' }} onClick={removingFJInstanceHandler.open} disabled={FJ_Instances && FJ_Instances.length == 0 || FJverifiedToken}>Remove Flapjack Instance</Button>
                    {FJ_Instance ? (!FJverifiedToken ? <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem', background: 'green' }} onClick={async () => {
                        setFJButton(true)
                        showNotification({
                            title: 'Instance Confirmed',
                            message: 'Instance selection was accepted.',
                            color: 'green',
                        });
                        setFJUploadingInfo({
                            name: "A generic name for FJ",
                            user: "A generic user for FJ",
                            affiliation: "A generic affiliation for FJ",
                            email: "A generic email for FJ",
                            instance: FJ_Instance.url
                        });
                    setFJVerifiedToken(true);}} disabled={!FJ_Instance}>Confirm Instance</Button>
                    :
                    <Button style={{ margin: '1rem', float: 'right', marginRight: '0rem', background: 'red' }} onClick={() => setFJVerifiedToken(false)}>Unconfirm Instance</Button>): <></>}
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
