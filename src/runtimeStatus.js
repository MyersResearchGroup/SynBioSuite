

const REQUESTED = "Requested"
const ACCEPTED = "Accepted"
const PENDING = "Pending"
const RUNNING = "Running"
const PROCESSING = "Processing"
const UPLOADING = "Uploading"
const COMPLETED = "Completed"
const FAILED = "Failed"
const CANCELLED = "Cancelled"

//Added for XDC Support
const CONNECTED = "Connected"
const VALIDATED = "Validated"
const CONVERSION = "Conversion"
const SBH_UPLOAD = "SynBioHub Upload"
const FJ_UPLOAD = "Flapjack Upload"

const statusGroups = {
    running: [REQUESTED, ACCEPTED, PENDING, RUNNING, UPLOADING, PROCESSING, CONNECTED, VALIDATED, CONVERSION, SBH_UPLOAD, FJ_UPLOAD],
    successful: [COMPLETED],
    unsuccessful: [FAILED, CANCELLED],
}

export const RuntimeStatus = {
    REQUESTED,
    ACCEPTED,
    PENDING,
    RUNNING,
    COMPLETED,
    FAILED,
    CANCELLED,
    CONNECTED,
    VALIDATED,
    CONVERSION,
    SBH_UPLOAD,
    FJ_UPLOAD,
    ...Object.fromEntries(
        Object.entries(statusGroups).map(([key, group]) => [
            key, status => group.includes(status)
        ])
    )
}