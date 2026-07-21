import axios from 'axios'
import commands from "./commands"
import { showErrorNotification } from './modules/util'
import { showNotification } from '@mantine/notifications';
import { readFileFromPath } from './redux/hooks/workingDirectoryHooks'
import { clearCredentials } from './modules/auth/credentialStore'
import {
    AUTH_ERROR_CODES,
    flapjackAdapter,
    synBioHubAdapter,
} from './modules/auth/providers/index.js'

const SBS_Server_Link = import.meta.env.VITE_SYNBIOSUITE_API

//There is an issue with where the file upload is not being sent correctly to the server
export async function upload_sbs(metadata, parameters) {
    try {
        const formdata = new FormData();
        
        const metadataFile = await metadata.getFile();
        formdata.append("Metadata", metadataFile, metadataFile.name || "metadata.xlsx");
    
        const parametersJson = JSON.stringify(parameters);
        const paramBlob = new Blob([parametersJson], { type: 'application/json' });
        formdata.append("Params", paramBlob, "parameters.json");
        
        const response = await axios.post(SBS_Server_Link + "/api/upload_sbs_up",
            formdata
        );
        
        return response.data;
    } catch (error) {
        console.error("Upload SBS error:", error);
        showErrorNotification('Error', error.message);
        throw error;
    }
}

export async function upload_resource(
    file,
    sbh_url,
    sbh_token,
    collectionUrl,
    workingDirectory = null,
    sbh_overwrite = 0
) {
    try {
        let data = new FormData();
        if (file) {
            let fileObject;
            if (typeof file === 'string') {
                if (!workingDirectory) {
                    throw new Error('Working directory handle is required when file is provided as a path string');
                }
                fileObject = await readFileFromPath(workingDirectory, file);
            } else {
                fileObject = typeof file.getFile === 'function' ? await file.getFile() : file;
            }
            data.append('Metadata', fileObject);
        }

        const paramsObj = {
            sbh_url: sbh_url,
            sbh_token: sbh_token,
            fj_url: null,
            sbh_user: null,
            sbh_pass: null,
            fj_token: null,
            fj_user: null,
            fj_pass: null,
            collection_url: collectionUrl,
            sbh_overwrite: sbh_overwrite,
            fj_overwrite: 1,
            version: "",
            attachments: {}
        }

        const paramsJson = JSON.stringify(paramsObj);
        const paramBlob = new Blob([paramsJson], { type: 'application/json' });
        data.append('Params', paramBlob, 'parameters.json');

        const response = await axios.post(
            SBS_Server_Link + '/api/uploadResource',
            data,
            {
              headers: {
                'Content-Type': 'multipart/form-data'
              },
            }
        );
        // showErrorNotification('Resource Upload Successful', 'Resource uploaded successfully');
        return response.data;
    } catch (error) {
      console.log(error.response?.data);
      const msg =
            error.response?.data?.error ||
            error.message ||
            'Unknown error';
      showErrorNotification('Resource Upload Failed', msg);
      throw error;
    }
}

export async function uploadExperiment(
    file,
    sbh_url,
    sbh_token,
    collectionUrl,
    workingDirectory = null,
    sbh_overwrite = 0,
    extraFiles = {}
) {
    try {
        let data = new FormData();
        if (file) {
            let fileObject;
            if (typeof file === 'string') {
                if (!workingDirectory) {
                    throw new Error('Working directory handle is required when file is provided as a path string');
                }
                fileObject = await readFileFromPath(workingDirectory, file);
            } else {
                fileObject = typeof file.getFile === 'function' ? await file.getFile() : file;
            }
            data.append('Metadata', fileObject);
        }

        const appendFileGroup = async (fieldName, files = []) => {
            for (const extraFile of files) {
                if (!extraFile) continue;

                let fileObject;
                if (typeof extraFile === 'string') {
                    if (!workingDirectory) {
                        throw new Error(`Working directory handle is required when ${fieldName} is provided as a path string`);
                    }
                    fileObject = await readFileFromPath(workingDirectory, extraFile);
                } else {
                    fileObject = typeof extraFile.getFile === 'function' ? await extraFile.getFile() : extraFile;
                }

                data.append(fieldName, fileObject, fileObject.name || fieldName);
            }
        };

        await appendFileGroup('Attachments', extraFiles.attachments || []);
        await appendFileGroup('Plate_Reader_Output', extraFiles.plateReaderOutputs || []);

        const paramsObj = {
            sbh_url: sbh_url,
            sbh_token: sbh_token,
            fj_url: null,
            sbh_user: null,
            sbh_pass: null,
            fj_token: null,
            fj_user: null,
            fj_pass: null,
            collection_url: collectionUrl,
            sbh_overwrite: sbh_overwrite,
            fj_overwrite: 1,
            version: "",
            attachments: Object.fromEntries(
                (extraFiles.attachments || [])
                    .filter(Boolean)
                    .map((attachmentFile) => {
                        const attachmentName = typeof attachmentFile === 'string'
                            ? attachmentFile.split('/').pop()
                            : attachmentFile.name;
                        return [attachmentName, attachmentName];
                    })
            ),
            ...(extraFiles.sheetName ? { sheet_name: extraFiles.sheetName } : {})
        }

        const paramsJson = JSON.stringify(paramsObj);
        const paramBlob = new Blob([paramsJson], { type: 'application/json' });
        data.append('Params', paramBlob, 'parameters.json');

        const response = await axios.post(
            SBS_Server_Link + '/api/uploadExperiment',
            data,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error("Upload Experiment error:", error);
        throw error;
    }
}

export async function submitAssembly(wizardInput, insertParts, acceptorBackbone) {
    var formdata = new FormData()

    // ensure that file is serialized and saved
    await commands.FileSave.execute(wizardInput.id)

    // attach input file
    const json = await wizardInput.getFile()
    const text = await json.text()

    for (const part of insertParts) formdata.append("insert_parts", await part.getFile())
    formdata.append("plasmid_backbone", await acceptorBackbone.getFile())
    formdata.append("wizard_selections", text)

    try {
        const response = await axios.post(SBS_Server_Link + '/sbol_2_build_golden_gate',
            formdata,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
    
        return response.data;
    } catch (error) {
        console.error(error);
    
        if (error.response) {
            showErrorNotification('Error ' + error.response.status, error.response.data?.error || 'Unknown server error');
        } else if (error.request) { // no response
            showErrorNotification('Network error', 'No response from server.');
        } else {
            showErrorNotification('Unexpected error', error.message);
        }
    
        throw error;
    }
}

export async function submitBuild(wizardInput, assemblyPlan) {
    console.log(wizardInput)
    console.log(assemblyPlan)
    
    var formdata = new FormData()

    // ensure that file is serialized and saved
    await commands.FileSave.execute(wizardInput.id)

    // attach input file
    const json = await wizardInput.getFile()
    const text = await json.text()

    formdata.append("assembly_plan", await assemblyPlan.getFile())
    formdata.append("wizard_selections", text)

    try {
        const response = await axios.post(SBS_Server_Link,
            formdata,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
    
        return response.data;
    } catch (error) {
        console.error(error);
    
        if (error.response) {
            showErrorNotification('Error ' + error.response.status, error.response.data?.error || 'Unknown server error');
        } else if (error.request) { // no response
            showErrorNotification('Network error', 'No response from server.');
        } else {
            showErrorNotification('Unexpected error', error.message);
        }
    
        throw error;
    }
}

export async function SBHLogin(url, username, password) {
    try {
        const result = await synBioHubAdapter.login({
            instance: url,
            email: username,
            password,
        });
        return result.credentials.accessToken;
    } catch (error) {
        showErrorNotification('Login Error', error.message);
        throw error;
    }
}

export async function searchCollections(url, auth) {
    try {
        if (typeof url !== "string" || url.trim() === "") return null;
        const response = await axios.get(`${url}/rootCollections`, {
            headers: {
                "Content-Type": "text/plain",
                "X-authorization": auth
            }
        });
        // This filters out all the public root collections so only private ones are returned
        if (Array.isArray(response.data)) {
            return response.data.filter(item => typeof item.uri === 'string' && !/\/public\//.test(item.uri));
        } else {
            throw new Error("Response from SynbioHub is not an array");
        }
    } catch (error) {
        if (error.response && error.response.status == 401 && error.response.data == "Login required"){
            showErrorNotification('Your SynbioHub Credentials Have Expired', "Try logging out and logging back in again")
        } else {
            showErrorNotification('Error Gathering Collections', error.message);
        }
        throw error;
    }
}

export async function createCollection(id, version, name, description, citations, auth, url, overwrite) {
    try {
        if(url == "") return;
        const formdata = new FormData();
        formdata.append('id', id);
        formdata.append('version', version);
        formdata.append('name', name);
        formdata.append('description', description);
        formdata.append('citations', citations);
        formdata.append('overwrite_merge', overwrite ? 1 : 0);

        const response = await axios.post(
            `${url}/submit`,
            formdata,
            {
                headers: {
                    "Accept": "text/plain",
                    "X-authorization": auth
                }
            }
        );        
        showNotification({
            title: 'Collection Created',
            message: `Collection "${name}" created successfully.`,
            color: 'green',
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status == 401 && error.response.data == "Login required"){
            showErrorNotification('Your SynbioHub Credentials Have Expired', "Try logging out and logging back in again")
        } else {
            showErrorNotification('Create Collection Error', error.response.data);
        }
        throw error;
    }
}

export async function SBHLogout(auth, url) {
    try {
        return await synBioHubAdapter.logout({ instance: url, accessToken: auth });
    } catch (error) {
        showErrorNotification('Logout Error', error.message);
        throw error;
    }
}

export async function FJLogin(instance, username, password){
    try {
        const result = await flapjackAdapter.login({
            instance,
            username,
            password,
        });
        return {
            ...result.profile,
            authtoken: result.credentials.accessToken,
            refresh: result.credentials.refreshToken,
        };
    } catch (error) {
        showErrorNotification('Login Error', error.message);
        throw error;
    }
};

export async function CheckLogin(instance, authToken){
    try {
        if (!authToken) {
            return { valid: false }
        }

        return await synBioHubAdapter.validate({ instance, accessToken: authToken });
    } catch (error) {
        if (error.code === AUTH_ERROR_CODES.TOKEN_EXPIRED) {
            return { valid: false };
        }

        showErrorNotification('Login Error', error.message);
        throw error;
    }
}


export async function getWebOfRegistries() {
    try {
        const response = await axios.get('https://wor.synbiohub.org/instances/');
        
        if (!Array.isArray(response.data)) {
            throw new Error("Response from Web of Registries is not an array");
        }

        // Map the WoR data to our registry format
        const registries = response.data.map(item => ({
            registryURL: item.uriPrefix,
            registryAPI: item.instanceUrl,
            registryPrefix: item.uriPrefix,
            name: item.name,
            description: item.description || '',
            email: '',
            authtoken: '',
            username: '',
            affiliation: ''
        }));

        return registries;
    } catch (error) {
        console.error("Get Web of Registries error:", error);
        showErrorNotification('Error', 'Failed to fetch registries from Web of Registries: ' + error.message);
        throw error;
    }
}


// Function to clear invalid credentials from local storage
export function clearInvalidCredentials(instanceUrl) {
    try {
        clearCredentials('synbiohub', instanceUrl);
    } catch (error) {
        console.error('Error clearing invalid credentials:', error);
    }
}
