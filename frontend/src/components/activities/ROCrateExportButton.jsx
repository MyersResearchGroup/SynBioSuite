import { ActionIcon, Loader, Tooltip } from '@mantine/core'
import { showNotification } from '@mantine/notifications'
import browserDownload from 'browser-downloads'
import { useState } from 'react'
import { FiPackage } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import { buildStudyRoCrate } from '../../modules/roCrate'
import { readStudy, showErrorNotification } from '../../modules/util'

export default function ROCrateExportButton() {
    const directoryHandle = useSelector(state => state.workingDirectory.directoryHandle)
    const isSaving = useSelector(state => state.saveIndicator.isSaving)
    const [isExporting, setIsExporting] = useState(false)

    const exportStudy = async () => {
        if (!directoryHandle || isSaving || isExporting) return
        setIsExporting(true)
        try {
            let study
            try {
                study = await readStudy(directoryHandle)
            } catch (error) {
                throw new Error(`Could not read study metadata "study.json":\n${error?.message || 'An unexpected error occurred'}`)
            }
            const { blob, fileName } = await buildStudyRoCrate(directoryHandle, study)
            try {
                await browserDownload(blob, fileName)
            } catch (error) {
                throw new Error(`Archive created, but the browser could not start the download.\n${error?.message || 'An unexpected error occurred'}`)
            }
            showNotification({
                title: 'RO-Crate exported',
                message: fileName,
                color: 'teal',
            })
        } catch (error) {
            showErrorNotification('RO-Crate export failed', error?.message || 'An unexpected error occurred')
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <Tooltip label={directoryHandle ? 'Export saved study as RO-Crate' : 'Open a study to export'} color="gray" position="right" withArrow>
            <ActionIcon
                onClick={exportStudy}
                disabled={!directoryHandle || isSaving || isExporting}
                sx={buttonStyle}
            >
                {isExporting ? <Loader size={24} /> : <FiPackage size={30} />}
            </ActionIcon>
        </Tooltip>
    )
}

const buttonStyle = theme => ({
    width: '100%',
    height: 60,
    borderRadius: 0,
    color: theme.colorScheme === 'dark' ? theme.other.inactiveColor : theme.colors.gray[7],
    '&:hover': {
        color: theme.colorScheme === 'dark' ? theme.other.activeColor : theme.colors.dark[8],
    },
})
