import axios from 'axios'
import commands from "./commands"
import { showErrorNotification } from './modules/util'
import { showNotification } from '@mantine/notifications';


//There is an issue with where the file upload is not being sent correctly to the server
export async function upload_sbs(metadata, parameters) {
    try {
        const formdata = new FormData();
        
        const metadataFile = await metadata.getFile();
        formdata.append("Metadata", metadataFile, metadataFile.name || "metadata.xlsx");
    
        const parametersJson = JSON.stringify(parameters);
        const paramBlob = new Blob([parametersJson], { type: 'application/json' });
        formdata.append("Params", paramBlob, "parameters.json");
        
        const response = await axios.post(import.meta.env.VITE_SYNBIOSUITE_API + "/api/upload_sbs_up",
            formdata
        );
        
        return response.data;
    } catch (error) {
        console.error("Upload SBS error:", error);
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
        const response = await axios.post(import.meta.env.VITE_SYNBIOSUITE_API + '/sbol_2_build_golden_gate',
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
        const response = await axios.post(import.meta.env.VITE_SBOL2BUILD_API,
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