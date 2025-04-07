import commands from "./commands"

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

    const response = await fetch(import.meta.env.VITE_SBOL2BUILD_API, {
        method: 'POST',
        body: formdata,
        redirect: 'follow'
    })
}