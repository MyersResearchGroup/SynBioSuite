import { Group, Loader, Text } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AiOutlineDownload } from 'react-icons/ai';
import { getPrimaryColor } from '../../../modules/colorScheme';
import { downloadBlob, fetchTemplate, XLSM_MIME_TYPE } from '../../../modules/metadataTemplates/browserDownload';
import { generateMetadataTemplate } from '../../../modules/metadataTemplates/generateMetadataTemplate';
import { getMetadataTemplate } from '../../../modules/metadataTemplates/templateManifest';
import useUnifiedModal from '../../../redux/hooks/useUnifiedModal';

export default function DownloadMetadata({ objectType }) {
    const { workflows } = useUnifiedModal();
    const [status, setStatus] = useState('');
    const activeController = useRef(null);
    const active = status !== '';
    const configuration = getMetadataTemplate(objectType?.id);

    useEffect(() => () => activeController.current?.abort(), []);

    const reportFailure = useCallback((caught, templateUrl) => {
        if (caught?.code === 'ABORTED') return;
        if (caught?.code === 'TEMPLATE_FETCH_FAILED' && templateUrl) {
            window.open(templateUrl, '_blank', 'noopener,noreferrer');
            showNotification({ title: 'Template source opened', message: 'The template could not be downloaded in SynBioSuite.', color: 'orange' });
            return;
        }
        showNotification({ title: 'Template download failed', message: caught?.message || 'Unable to prepare the metadata template.', color: 'red' });
    }, []);

    const runGeneration = useCallback(async (collectionResult) => {
        const controller = new AbortController();
        activeController.current = controller;
        try {
            const collection = collectionResult?.collections?.[0];
            const apiUrl = collectionResult?.registryAPI || collectionResult?.repository?.registryAPI;
            const authToken = collectionResult?.authToken;
            if (!collection?.uri || !apiUrl || !authToken) throw new Error('The selected repository is missing validated connection details. Please log in again.');
            const result = await generateMetadataTemplate({
                configuration,
                collectionUri: collection.uri,
                apiUrl,
                authToken,
                signal: controller.signal,
                onStatus: setStatus,
            });
            downloadBlob(result.blob, configuration.filename);
            setStatus('Template ready');
            showNotification({
                title: 'Template ready',
                message: result.rows.length === 0 ? 'No matching SynBioHub objects were found; a valid blank template was downloaded.' : `Populated ${result.rows.length} SynBioHub object${result.rows.length === 1 ? '' : 's'}.`,
                color: result.rows.length === 0 ? 'yellow' : 'green',
            });
        } catch (caught) {
            reportFailure(caught, configuration?.templateUrl);
        } finally {
            activeController.current = null;
            setTimeout(() => setStatus(''), 300);
        }
    }, [configuration, reportFailure]);

    const handleClick = useCallback(async () => {
        if (active || !configuration) return;
        if (configuration.populations.length === 0) {
            const controller = new AbortController();
            activeController.current = controller;
            setStatus('Downloading template');
            try {
                const template = await fetchTemplate(configuration.templateUrl, controller.signal);
                downloadBlob(new Blob([template], { type: XLSM_MIME_TYPE }), configuration.filename);
                setStatus('Template ready');
            } catch (caught) {
                reportFailure(caught, configuration.templateUrl);
            } finally {
                activeController.current = null;
                setTimeout(() => setStatus(''), 300);
            }
            return;
        }
        setStatus('Select source collection');
        workflows.browseCollections((result) => {
            if (!result?.completed || !result.collections?.[0]) {
                setStatus('');
                return;
            }
            runGeneration(result);
        }, { multiSelect: false, rootOnly: true });
    }, [active, configuration, reportFailure, runGeneration, workflows]);

    if (!configuration) return null;
    return (
        <Group sx={groupStyle} onClick={handleClick} aria-disabled={active} style={active ? { opacity: 0.65, pointerEvents: 'none' } : undefined}>
            {active ? <Loader size="xs" /> : <AiOutlineDownload />}
            <Text sx={textStyle} size="sm">{active ? status : 'Download Template'}</Text>
        </Group>
    );
}

const groupStyle = (theme) => ({
    padding: '3px 0 3px 8px', borderRadius: 3, cursor: 'pointer', color: getPrimaryColor(theme, 5),
    '&:hover': { backgroundColor: theme.colors.dark[5] },
});

const textStyle = (theme) => ({
    flexGrow: 1, textOverflow: 'ellipsis', whiteSpace: 'nowrap', userSelect: 'none', color: getPrimaryColor(theme, 5), fontWeight: 500,
});
