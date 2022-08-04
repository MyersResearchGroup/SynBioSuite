

const REQUESTED = "Requested"
const ACCEPTED = "Accepted"
const PENDING = "Pending"
const RUNNING = "Running"
const COMPLETED = "Completed"
const FAILED = "Failed"
const CANCELLED = "Cancelled"

const statusGroups = {
    running: [REQUESTED, ACCEPTED, PENDING, RUNNING],
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
    ...Object.fromEntries(
        Object.entries(statusGroups).map(([key, group]) => [
            key, status => group.includes(status)
        ])
    )
}