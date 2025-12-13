import Activities from '../components/activities/Activities';
import Panels from '../components/panels/Panels';
import BrowserCompatiblityCatch from '../components/BrowserCompatiblityCatch';
import LoginModal from '../modules/modular_login/loginModal';
import { useSelector, useDispatch } from 'react-redux';
import { closeModal, closeSBH, closeFJ, closeAddSBHrepository, closeAddFJrepository, closeCreateCollection, closeSBHLogin } from '../redux/slices/modalSlice';
import FJModal from '../modules/modular_login/FJModal';
import SBHModal from '../modules/modular_login/SBHModal';
import AddSBHRepository from '../modules/modular_login/addSBHRepository';
import AddFJRepository from '../modules/modular_login/addFJRepository';
import CreateCollectionModal from '../modules/CreateCollectionModal';
import SBHOnly from '../modules/modular_login/SBHOnly';


export default function LocalHome() {
    const loginModalOpened = useSelector((state) => state.modal.bothOpen);
    const sbhModalOpened = useSelector((state) => state.modal.sbhOpen);
    const fjModalOpened = useSelector((state) => state.modal.fjOpen);

    const addSBHRepositoryOpened = useSelector((state) => state.modal.addSBHrepository);
    const addFJRepositoryOpened = useSelector((state) => state.modal.addFJrepository)
    
    const collectionModalOpened = useSelector((state) => state.modal.addCollections)
    
    const SBHOnlyOpened = useSelector((state) => state.modal.sbhLoginOpen)

    const libraryName = useSelector((state) => state.modal.libraryName)
    const libraryDescription = useSelector((state) => state.modal.libraryDescription)

    const dispatch = useDispatch();

    return (
        <>
            <Activities />
            <Panels />
            <BrowserCompatiblityCatch />
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
            <FJModal
                opened={fjModalOpened}
                onClose={() => dispatch(closeFJ())}
                repoName=""
            />
            <AddSBHRepository 
                opened={addSBHRepositoryOpened}
                onClose={() => dispatch(closeAddSBHrepository())}
            />
            <AddFJRepository
                opened={addFJRepositoryOpened}
                onClose={() => dispatch(closeAddFJrepository())}
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