import Activities from '../components/activities/Activities';
import LoginModal from '../modules/modular_login/loginModal';
import { useSelector, useDispatch } from 'react-redux';
import { closeModal, closeSBH, closeFJ, closeCreateCollection, closeSBHLogin, closeMicrosoft } from '../redux/slices/modalSlice';
import FJModal from '../modules/modular_login/FJModal';
import SBHModal from '../modules/modular_login/SBHModal';
import CreateCollectionModal from '../modules/CreateCollectionModal';
import SBHOnly from '../modules/modular_login/SBHOnly';
import MicrosoftPanels from '../components/microsoft/MicrosoftPanels';
import MicrosoftModal from '../components/microsoft/MicrosoftModal';

// TODO: Update so that this is shared with LocalHome
export default function CloudHome() {
    const loginModalOpened = useSelector((state) => state.modal.bothOpen);
    const microsoftModalOpened = useSelector((state) => state.modal.microsoftOpen);
    const sbhModalOpened = useSelector((state) => state.modal.sbhOpen);
    const fjModalOpened = useSelector((state) => state.modal.fjOpen);
    
    const collectionModalOpened = useSelector((state) => state.modal.addCollections)
    
    const SBHOnlyOpened = useSelector((state) => state.modal.sbhLoginOpen)

    const libraryName = useSelector((state) => state.modal.libraryName)
    const libraryDescription = useSelector((state) => state.modal.libraryDescription)

    const dispatch = useDispatch();
    return (
        <>
            <Activities />
            <MicrosoftPanels />
            <MicrosoftModal
                opened={microsoftModalOpened}
                onClose={() => dispatch(closeMicrosoft())}
            />
            <LoginModal
                opened={loginModalOpened}
                onClose={() => dispatch(closeModal())}
                repoName=""
            />
            <SBHModal
                opened={sbhModalOpened}
                onClose={() => dispatch(closeSBH())}
                repoName=""
            />
            <FJModal
                opened={fjModalOpened}
                onClose={() => dispatch(closeFJ())}
                repoName=""
            />
            <CreateCollectionModal 
                opened={collectionModalOpened}
                libraryName={libraryName}
                libraryDescription={libraryDescription}
                onClose={() => dispatch(closeCreateCollection())}
            />
            <SBHOnly
                opened={SBHOnlyOpened}
                onClose={() => dispatch(closeSBHLogin())}
            />
        </>
    );
}