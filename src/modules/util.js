

export function titleFromRunFileName(fileName) {
    let title = fileName
        .replace(".tsd", "")
        .replace("-", " ")

    title = title.slice(0, 1).toUpperCase() +
        title.slice(1)

    return title
}