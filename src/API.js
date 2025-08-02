import axios from 'axios'
import commands from "./commands"
import { showErrorNotification } from './modules/util'


export async function new_upload_sbs(metadata, parameters) {
    const formdata = new FormData();
    const metadataFile = await metadata.getFile();

    formdata.append("Metadata", metadataFile, metadataFile.name || "metadata.xlsx")

    const parametersJson = JSON.stringify(parameters);
    const paramBlob = new Blob([parametersJson], { type: 'application/json' });
    formdata.append("Params", paramBlob, "parameters.json");

    const requestOptions = {
    method: "POST",
    body: formdata,
    redirect: "follow"
    };

    fetch("http://127.0.0.1:5003/api/upload_sbs", requestOptions)
    .then((response) => response.text())
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
}

//There is an issue with where the file upload is not being sent correctly to the server
export async function upload_sbs(metadata, parameters) {
    try {
        const formdata = new FormData();
        
        const metadataFile = await metadata.getFile();
        formdata.append("Metadata", metadataFile, metadataFile.name || "metadata.xlsx");
    
        const parametersJson = JSON.stringify(parameters);
        const paramBlob = new Blob([parametersJson], { type: 'application/json' });
        formdata.append("Params", paramBlob, "parameters.json");
        
        const response = await axios.post(import.meta.env.VITE_SYNBIOSUITE_API + "/api/upload_sbs",
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