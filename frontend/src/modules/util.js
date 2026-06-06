import React, { useState } from "react"
import { showNotification } from "@mantine/notifications"

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

export function showErrorNotification(title, message) {
    showNotification({
        title,
        color: "red",
        message: typeof message === "object" && message !== null
            ? React.createElement(ConversionError, { error: message })
            : message,
        autoClose: false,
    });
}

function ConversionError({ error }) {
    const [showDetails, setShowDetails] = useState(false)

    if (!error) {
        return null
    }

    const technicalDetails = [
        `Error code: ${error.code || ""}`,
        "",
        "Details:",
        error.details || "",
        "",
        "Terminal output:",
        error.technical_details?.terminal_output || "",
        "",
        "Python traceback:",
        error.technical_details?.traceback || "",
    ].join("\n")

    return React.createElement(
        "div",
        null,
        React.createElement("strong", null, error.message || "Conversion failed"),
        error.hint ? React.createElement("p", null, error.hint) : null,
        React.createElement(
            "button",
            {
                type: "button",
                onClick: () => setShowDetails(!showDetails),
                style: {
                    background: "transparent",
                    border: "1px solid currentColor",
                    borderRadius: 4,
                    color: "inherit",
                    cursor: "pointer",
                    padding: "2px 8px",
                },
            },
            showDetails ? "Hide details" : "More"
        ),
        showDetails ? React.createElement(
            "pre",
            {
                style: {
                    marginTop: 8,
                    maxHeight: 300,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                },
            },
            technicalDetails
        ) : null
    )
}
