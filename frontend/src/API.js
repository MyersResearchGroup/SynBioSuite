import axios from 'axios'
import commands from "./commands"
import { showErrorNotification } from './modules/util'
import { showNotification } from '@mantine/notifications';
import { readFileFromPath } from './redux/hooks/workingDirectoryHooks'

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
    sbh_collec,
    sbh_collec_desc = "",
    sbh_overwrite = false,
    fj_url = undefined,
    fj_token = undefined,
    fj_overwrite = false,
    workingDirectory = null
) {
    try {
        let data = new FormData();
        if (file) {
            console.log('File parameter type:', typeof file, file);
            let fileObject;
            if (typeof file === 'string') {
                console.log('Reading file from path:', file);
                fileObject = await readFileFromPath(workingDirectory, file);
            } else {
                fileObject = typeof file.getFile === 'function' ? await file.getFile() : file;
            }
            console.log('File object to upload:', fileObject);
            data.append('Metadata', fileObject);
        }

        const paramsObj = {
            sbh_url,
            sbh_token,
            sbh_collec,
            sbh_collec_desc,
            fj_overwrite,
            sbh_overwrite
        };
        if (fj_url !== undefined) paramsObj.fj_url = fj_url;
        if (fj_token !== undefined) paramsObj.fj_token = fj_token;

        const paramsJson = JSON.stringify(paramsObj);
        const paramBlob = new Blob([paramsJson], { type: 'application/json' });
        data.append('Params', paramBlob, 'parameters.json');

        const response = await axios.post(
            'http://127.0.0.1:5003/api/uploadResource',
            data,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                maxBodyLength: Infinity
            }
        );
        return response.data;
    } catch (error) {
        console.error("Upload Resource error:", error);
        showErrorNotification('Error', error.message);
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
        var formdata = new FormData();
        formdata.append('email', username);
        formdata.append('password', password);

        const response = await axios.post(`https://${url}/login`, {
            "email": username,
            "password": password
        }, {
            headers: {
                "Accept": "text/plain",
                "Content-Type": "application/json"
            }
        });

        return response.data;
    } catch (error) {
        console.error("SBHLogin error:", error);
        showErrorNotification('Login Error', error.message);
        throw error;
    }
}

export async function searchCollections(url, auth) {
    try {
        if (typeof url !== "string" || url.trim() === "") return null;
        const response = await axios.get(`https://${url}/rootCollections`, {
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

export async function createCollection(id, version, name, description, citations, auth, url) {
    try {
        if(url == "") return;
        const formdata = new FormData();
        formdata.append('id', id);
        formdata.append('version', version);
        formdata.append('name', name);
        formdata.append('description', description);
        formdata.append('citations', citations);

        const response = await axios.post(
            `https://${url}/submit`,
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
        const response = await axios.post(
            `https://${url}/logout`,
            null,
            {
                headers: {
                    "Accept": "text/plain",
                    "X-authorization": auth
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error("SBHLogout error:", error);
        showErrorNotification('Logout Error', error.message);
        throw error;
    }
}

export async function FJLogin(instance, username, password){
    try {
        const response = await axios.post(`https://${instance}/api/auth/log_in/`, {
            "username": username,
            "password": password
        }, {
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if(response.data){
            return {
                username: response.data.username,
                email: response.data.email,
                authtoken: response.data.access,
                refresh: response.data.refresh
            }
        }
    } catch (error) {
        console.error("FJLogin error:", error);
        showErrorNotification('Login Error', error.message);
        throw error;
    }
};

export async function CheckLogin(instance, authToken){
    try {
        if (!authToken) {
            return { valid: false }
        }

        const response = await axios.get(`https://${instance}/profile`, {
            headers: {
                "Accept": "text/plain",
                "X-authorization": authToken
            },
        });

        // Return user profile information for email verification
        return { 
            valid: true, 
            profile: response.data
        };
    } catch (error) {
        if (error.response?.status === 401) {
            return { valid: false };
        }

        console.error("CheckLogin error:", error);
        showErrorNotification('Login Error', error.message);
        throw error;
    }
}

// Function to clear invalid credentials from local storage
export function clearInvalidCredentials(instanceUrl) {
    try {
        // Get current SynbioHub data from localStorage
        const storedData = localStorage.getItem('SynbioHub');
        if (!storedData) return;
        
        const dataSBH = JSON.parse(storedData);
        
        // Find and clear the credentials for the specific instance
        const updatedData = dataSBH.map(repo => {
            if (repo.value === instanceUrl) {
                // Clear auth-related fields but keep the repository info
                return {
                    ...repo,
                    authtoken: '',
                    email: '',
                    name: '',
                    username: '',
                    affiliation: ''
                };
            }
            return repo;
        });
        
        // Save updated data back to localStorage
        localStorage.setItem('SynbioHub', JSON.stringify(updatedData));
    } catch (error) {
        console.error('Error clearing invalid credentials:', error);
    }
}