import { msalInstance } from '../../microsoft-utils/auth/msalInit'
import { useAutoSavePanel } from '../../redux/hooks/panelsHooks'

/*
    Extracted this to its own component to prevent unnecessary
    re-renders as a result of auto-saving.
*/

export default function PanelSaver({ id }) {
    const source = msalInstance.getActiveAccount() !== null ? 'onedrive' : 'local'
    useAutoSavePanel(id, 4000, source)
    return <></>
}
