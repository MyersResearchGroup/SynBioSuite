import Activities from '../components/activities/Activities';
import { useSelector, useDispatch } from 'react-redux';
import { closeMicrosoft } from '../redux/slices/modalSlice';
import MicrosoftPanels from '../components/microsoft/MicrosoftPanels';
import MicrosoftModal from '../components/microsoft/MicrosoftModal';

// TODO: Update so that this is shared with LocalHome
export default function CloudHome() {
    const microsoftModalOpened = useSelector((state) => state.modal.microsoftOpen);

    const dispatch = useDispatch();
    return (
        <>
            <Activities />
            <MicrosoftPanels />
            <MicrosoftModal
                opened={microsoftModalOpened}
                onClose={() => dispatch(closeMicrosoft())}
            />
        </>
    );
}