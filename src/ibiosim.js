
export async function submitAnalysis(input, { environment, parameters }) {

    var formdata = new FormData()

    // attach input file
    formdata.append("input", await input.getFile())

    // either attach environment file or parameters
    environment ?
        formdata.append("environment", await environment.getFile()) :
        Object.entries(parameters)
            .filter(([, value]) => value != null)
            .forEach(
                ([key, value]) => formdata.append(key, value)
            )

    // send request
    const response = await fetch(import.meta.env.VITE_IBIOSIM_API, {
        method: 'POST',
        body: formdata,
        redirect: 'follow'
    })

    // parse response as JSON and return
    return await response.json()
}

export async function pollStatus(orchestration) {

    if (!orchestration?.statusQueryGetUri)
        return

    // fetch and parse status
    const response = await fetch(orchestration.statusQueryGetUri)
    const status = await response.json()

    console.debug("Status:", status.runtimeStatus)

    // stop if job isn't complete
    if (status.runtimeStatus != 'Completed')
        return

    // parse & return output
    return await parseOutput(status.output)
}

export async function terminateAnalysis(orchestration) {

    if (!orchestration?.terminatePostUri)
        return

    // POST to terminate URI
    return await fetch(orchestration.terminatePostUri, {
        method: 'POST'
    })

    // this will respond with 202 if termination was accepted,
    // or 410 (Gone) if already terminated or complete.
}

async function parseOutput(outputArray) {

    return Object.fromEntries(
        Object.entries(outputArray).map(([fileName, data]) => [
            fileName,
            JSON.parse(
                data
                    .replaceAll('(', '[')
                    .replaceAll(')', ']')
            )
        ])
    )
}