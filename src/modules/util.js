

export function titleFromRunFileName(fileName) {
    let title = fileName
        .replace(".tsd", "")
        .replace("-", " ")

    title = title.slice(0, 1).toUpperCase() +
        title.slice(1)

    return title
}

export function betterMax(arr) {
    if (arr.length)
        return arr.reduce((accum, current) => current > accum ? current : accum, arr[0])
}