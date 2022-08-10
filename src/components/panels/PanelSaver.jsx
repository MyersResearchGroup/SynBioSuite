import { useAutoSavePanel } from '../../redux/hooks/panelsHooks'

/*
    Extracted this to its own component to prevent unnecessary
    re-renders as a result of auto-saving.
*/

export default function PanelSaver({ id }) {
    useAutoSavePanel(id, 4000)
    return <></>
}
