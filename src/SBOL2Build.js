import axios from 'axios'
import commands from "./commands"
import { showErrorNotification } from './modules/util'

export async function submitAssembly(wizardInput, insertParts, acceptorBackbone) {
    console.log(wizardInput)
    console.log(insertParts)
    console.log(acceptorBackbone)
    
    var formdata = new FormData()

    // ensure that file is serialized and saved
    await commands.FileSave.execute(wizardInput.id)

    // attach input file
    formdata.append("wizard_selections", await wizardInput.getFile())

    formdata.append("plasmid_backbone", await acceptorBackbone.getFile())
    
    for (const part of insertParts) {
        formdata.append("insert_parts", await part.getFile())
    }

    const sleep = (ms) => new Promise(res => setTimeout(res, ms));
    await sleep(5000)

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
            showErrorNotification('Error ' + error.response.status, error.response.data?.message || 'Unknown server error');
        } else if (error.request) { // no response
            showErrorNotification('Network error', 'No response from server.');
        } else {
            showErrorNotification('Unexpected error', error.message);
        }
    
        throw error;
    }
}