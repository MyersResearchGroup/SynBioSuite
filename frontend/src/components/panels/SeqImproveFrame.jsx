import { LoadingOverlay, Progress } from '@mantine/core'
import { showNotification } from '@mantine/notifications'
import { useLocalStorage } from '@mantine/hooks'
import { useState, useEffect, useRef, useContext } from 'react'
import { useSelector } from 'react-redux'
import { PanelContext } from './SeqImprovePanel'
import { usePanelProperty } from '../../redux/hooks/panelsHooks'
import store from '../../redux/store'
import { createFileInDirectory, writeToFileHandle } from '../../redux/hooks/workingDirectoryHooks'
import { ObjectTypes } from '../../objectTypes'
import { CheckLogin, clearInvalidCredentials } from '../../API'
import { openUnifiedModal } from '../../redux/slices/modalSlice'
import { MODAL_TYPES } from '../../modules/unified_modal/unifiedModal'

export default function SeqImproveFrame({ fileTypeObjectId }) {
    const { url, panelId } = useContext(PanelContext)
    const [sbolContent, setSBOLContent] = usePanelProperty(panelId, 'sbol', false)
 
    const iframeRef = useRef()
    const saveQueue = useRef(Promise.resolve())

    const [iframeLoaded, setIFrameLoaded] = useState(false)
    const [sbolContentLoaded, setSbolContentLoaded] = useState(!sbolContent)
    const loadProgress = 10 + (iframeLoaded + sbolContentLoaded) * 45

    // messages in are only taken from SeqImprove's origin, so a SynBioHub session only ever goes out in
    // answer to SeqImprove itself. resolved as the iframe resolves its src, so a relative URL pins too
    const targetOrigin = (() => {
        try { return new URL(url, window.location.href).origin } catch { return '*' }
    })()

    const reply = message => iframeRef.current?.contentWindow?.postMessage(message, targetOrigin)

    // SeqImprove uses this app's SynBioHub login instead of its own. the document in the frame has to
    // ask for it first, and every load of the frame starts over
    const sessionAsked = useRef(false)
    const frameLoads = useRef(0)

    // answers SeqImprove's request (requestId), or pushes the session when the login changes
    const sendSession = async requestId => {
        const load = frameLoads.current
        const repo = sharedSynBioHubRepo()
        let check = null
        if (repo) {
            // a check that fails (SynBioHub unreachable, say) sends the login unchecked rather than log SeqImprove out
            check = await CheckLogin(registryAPIOf(repo), repo.authtoken).catch(() => ({ valid: true }))
        }
        // a new document has loaded in the frame since, or the login changed while it was checked
        // and the push for the new one is on its way
        if (load !== frameLoads.current || sessionKey(sharedSynBioHubRepo()) !== sessionKey(repo)) return
        // SynBioHub turned it down: drop it here too, so both apps agree it's gone
        if (repo && !check.valid) clearInvalidCredentials(repo.registryURL)
        const session = repo && check.valid
            ? { token: repo.authtoken, urlPrefix: registryAPIOf(repo), username: check.profile?.username || repo.username || '' }
            : null
        reply(requestId ? { type: 'synBioHubSession', requestId, session } : { type: 'synBioHubSession', session })
    }

    const messageListener = ({ data, source, origin }) => {
        if (source !== iframeRef.current?.contentWindow || origin !== targetOrigin) return
        if (data === 'graphServiceLoadedSBOL') {
            setSbolContentLoaded(true)
            return
        }
        if (data?.type === 'getSynBioHubSession') {
            sessionAsked.current = true
            sendSession(data.requestId)
            return
        }
        // SeqImprove's Log in button: already logged in here, it gets that login; otherwise this app's
        // login form opens, and SeqImprove gets the session as it stands once that closes
        if (data?.type === 'openSynBioHubLogin') {
            sessionAsked.current = true
            const load = frameLoads.current
            if (sharedSynBioHubRepo()) sendSession(data.requestId)
            else openSynBioHubLogin(() => load === frameLoads.current && sendSession(data.requestId))
            return
        }
        if (data?.type === 'checkFileName') {
            ;(async () => {
                try {
                    const { dir } = await getSaveDirectory(panelId)
                    const requested = cleanFileName(data.displayID)
                    const fileName = await getAvailableFileName(dir, requested)
                    reply({ type: 'fileNameSuggestion', requestId: data.requestId, requested, fileName, exists: fileName !== requested })
                }
                catch (err) {
                    const message = err?.message ?? String(err)
                    reply({ type: 'fileNameSuggestion', requestId: data.requestId, error: message })
                    showNotification({ title: 'Save failed', message, color: 'red' })
                }
            })()
            return
        }
        if (data?.sbol) {
            console.debug('Received SBOL from SeqImprove:', data.sbol.substring(0, 100))
            setSBOLContent(data.sbol)

            if (data.source === 'seqimprove') {
                // this app owns the save toasts; SeqImprove only uses the reply to stop its spinner
                // saves run one at a time so two quick saves can't both pick the same free name
                saveQueue.current = saveQueue.current.then(async () => {
                    try {
                        const { dir, subdir } = await getSaveDirectory(panelId)

                        // never overwrite an existing file. a name the user picked that has been taken
                        // since the check goes back to SeqImprove to re-prompt; older SeqImprove builds
                        // that only send a displayID get the next free _N name instead.
                        let baseName
                        if (data.fileName) {
                            baseName = cleanFileName(data.fileName)
                            if (await fileExists(dir, baseName + '.xml')) {
                                const suggestion = await getAvailableFileName(dir, baseName)
                                reply({ type: 'saveResult', requestId: data.requestId, ok: false, reason: 'exists', fileName: baseName, suggestion })
                                return
                            }
                        }
                        else {
                            baseName = await getAvailableFileName(dir, cleanFileName(data.displayID))
                        }
                        const safeName = baseName + '.xml'
                        const fileHandle = await createFileInDirectory(
                            dir,
                            safeName,
                            subdir === 'plasmids' ? ObjectTypes.Plasmids.id : ObjectTypes.Devices.id,
                            store.dispatch,
                            subdir,
                        )
                        await writeToFileHandle(fileHandle, data.sbol)
                        reply({ type: 'saveResult', requestId: data.requestId, ok: true, path: `${subdir}/${safeName}` })
                        showNotification({ title: 'Saved to working directory', message: `${subdir}/${safeName}`, color: 'teal' })
                    }
                    catch (err) {
                        const message = err?.message ?? String(err)
                        reply({ type: 'saveResult', requestId: data.requestId, ok: false, reason: 'error', message })
                        showNotification({ title: 'Save failed', message, color: 'red' })
                    }
                })
            }
            return
        }
        if (data?.error) {
            showNotification({
                title: 'SeqImprove error',
                message: data.error.message,
                color: 'red',
            })
        }
    }

    useEffect(() => {
        window.addEventListener('message', messageListener)
        return () => window.removeEventListener('message', messageListener)
    }, [])

    // fresh "Annotate Plasmid / Device" panels have no file handle, so fall back to the panel's subdirectory
    const subdirectory = usePanelProperty(panelId, 'subdirectory')
    const panelType = fileTypeObjectId
        ?? (subdirectory === ObjectTypes.Plasmids.subdirectory ? ObjectTypes.Plasmids.id
            : subdirectory === ObjectTypes.Devices.subdirectory ? ObjectTypes.Devices.id
            : null)
    const sentPanelType = useRef(undefined)

    // the SeqImprove panel is a singleton: opening Annotate Device while the Annotate Plasmid tab is
    // still open reuses the same iframe without reloading it, so tell SeqImprove the new type
    useEffect(() => {
        if (!iframeLoaded || sentPanelType.current === panelType) return
        sentPanelType.current = panelType
        reply({ type: 'panelType', panelType })
    }, [iframeLoaded, panelType])

    // a login, logout or primary repository change goes to a SeqImprove that has asked for the session
    const sbhPrimary = useSelector(state => state.primaryRepository.sbhPrimary)
    const [sbhRepos] = useLocalStorage({ key: 'SynbioHub', defaultValue: [] })
    const currentSessionKey = sessionKey(pickSharedSynBioHubRepo(sbhRepos, sbhPrimary))
    useEffect(() => {
        if (sessionAsked.current) sendSession()
    }, [currentSessionKey])

    const handleIFrameLoad = () => {
        frameLoads.current++
        sessionAsked.current = false
        setIFrameLoaded(true)
        setSbolContentLoaded(!sbolContent)
        sentPanelType.current = panelType

        iframeRef.current.contentWindow.postMessage(
            sbolContent
                ? { sbol: sbolContent, panelType }
                : { panelType },
            targetOrigin,
        )
    }

    return (
        <div style={containerStyle}>
            <iframe
                src={url + '?ignoreHTTPErrors=true'}
                style={iframeStyle(sbolContentLoaded)}
                width="100%"
                height="100%"
                frameBorder="0"
                onLoad={handleIFrameLoad}
                loading="lazy"
                ref={iframeRef}
                title="SeqImprove"
            />
            {loadProgress < 100 && <>
                <Progress value={loadProgress} radius={0} size="md" styles={progressStyles} />
                <LoadingOverlay visible={true} overlayOpacity={0} />
            </>}
        </div>
    )
}

async function getSaveDirectory(panelId) {
    const workDir = store.getState().workingDirectory.directoryHandle
    if (!workDir)
        throw new Error('No working directory selected')

    const subdir = store.getState().panels.entities[panelId]?.subdirectory
    const dir = await workDir.getDirectoryHandle(subdir, { create: true })
    return { dir, subdir }
}

// the SynBioHub login SeqImprove gets: the primary repository's, or the only logged-in one when
// there's no primary. none when the primary is logged out
function pickSharedSynBioHubRepo(repos, sbhPrimary) {
    const loggedIn = (Array.isArray(repos) ? repos : []).filter(repo => repo?.authtoken)
    if (sbhPrimary) return loggedIn.find(repo => repo.registryURL === sbhPrimary) ?? null
    return loggedIn.length === 1 ? loggedIn[0] : null
}

function sharedSynBioHubRepo() {
    let repos = []
    try { repos = JSON.parse(localStorage.getItem('SynbioHub')) } catch {}
    return pickSharedSynBioHubRepo(repos, store.getState().primaryRepository.sbhPrimary)
}

function sessionKey(repo) {
    return JSON.stringify([repo?.registryURL ?? null, repo?.authtoken ?? null])
}

function registryAPIOf(repo) {
    return (repo.registryAPI || repo.registryURL).replace(/\/+$/, '')
}

// the same SBH_LOGIN workflow commands.js opens, for the primary repository (or the only one there
// is); with neither, the repository picker comes first. onClosed runs once the modal has closed,
// however that happened: a dismissed modal doesn't run a workflow callback
function openSynBioHubLogin(onClosed) {
    let repos = []
    try { repos = JSON.parse(localStorage.getItem('SynbioHub')) || [] } catch {}
    const selectedRepo = store.getState().primaryRepository.sbhPrimary || (repos.length === 1 ? repos[0]?.registryURL : '')
    store.dispatch(openUnifiedModal(selectedRepo
        ? {
            modalType: MODAL_TYPES.SBH_LOGIN,
            allowedModals: [MODAL_TYPES.SBH_LOGIN, MODAL_TYPES.ADD_SBH_REPO],
            props: { selectedRepo },
        }
        : {
            modalType: MODAL_TYPES.SBH_INSTANCE_SELECTOR,
            allowedModals: [MODAL_TYPES.SBH_INSTANCE_SELECTOR, MODAL_TYPES.SBH_LOGIN, MODAL_TYPES.ADD_SBH_REPO],
        }))
    const unsubscribe = store.subscribe(() => {
        if (store.getState().modal.unifiedModalOpen) return
        unsubscribe()
        onClosed()
    })
}

function cleanFileName(name) {
    const cleaned = String(name ?? '').trim().replace(/\.xml$/i, '')
    if (!cleaned || /[\\/:*?"<>|]/.test(cleaned) || cleaned === '.' || cleaned === '..')
        throw new Error(`"${name ?? ''}" is not a valid file name`)
    return cleaned
}

async function fileExists(dir, fileName) {
    try {
        await dir.getFileHandle(fileName)
        return true
    }
    catch (err) {
        if (err?.name === 'NotFoundError')
            return false
        // a folder with this name also counts as taken
        if (err?.name === 'TypeMismatchError')
            return true
        throw err
    }
}

// device1 -> device1 if free, otherwise device1_1, device1_2, ...
async function getAvailableFileName(dir, baseName, maxAttempts = 1000) {
    if (!await fileExists(dir, baseName + '.xml'))
        return baseName
    for (let i = 1; i <= maxAttempts; i++) {
        const candidate = `${baseName}_${i}`
        if (!await fileExists(dir, candidate + '.xml'))
            return candidate
    }
    throw new Error(`No free file name found for ${baseName}`)
}

const progressStyles = theme => ({
    root: { position: 'absolute', top: 0, width: '100%' },
    bar: { transition: 'width 0.3s' },
})

const iframeStyle = show => ({
    overflow: 'hidden',
    visibility: show ? 'visible' : 'hidden',
})

const containerStyle = {
    height: '94vh',
    overflowY: 'hidden',
    position: 'relative',
}
