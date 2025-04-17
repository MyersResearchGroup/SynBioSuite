

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
const WAITING = "Waiting"

const statusGroups = {
    running: [REQUESTED, ACCEPTED, PENDING, RUNNING, UPLOADING, PROCESSING, WAITING, UPLOADING],
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
    WAITING,
    PROCESSING,
    UPLOADING,
    ...Object.fromEntries(
        Object.entries(statusGroups).map(([key, group]) => [
            key, status => group.includes(status)
        ])
    )
}