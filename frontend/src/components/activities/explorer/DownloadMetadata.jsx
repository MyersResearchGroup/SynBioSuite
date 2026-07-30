import { Group, Text } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { getPrimaryColor } from "../../../modules/colorScheme";
import { FiDownload } from "react-icons/fi";
import { download_template } from "../../../API";
import { useSelector } from "react-redux";
import { showErrorNotification } from '../../../modules/util';
import { readStudy } from "../../../modules/util";
import { useUnifiedModal } from "../../../redux/hooks/useUnifiedModal";
import { useLocalStorage } from "@mantine/hooks";

export default function DownloadMetadata({ objectType }) {

    const dirName = useSelector(state => state.workingDirectory.directoryHandle);

    const [dataSBH] = useLocalStorage({ key: 'SynbioHub', defaultValue: [] })

    const { workflows } = useUnifiedModal()

    async function runDownloadTemplateWorkflow() {
        return new Promise((resolve) => {
            workflows.importToStudy(resolve, {
                multiSelect: false,
                rootOnly: true,
            })
        })
    }
    
    const handleClick = async () => {
        let url;
        let filename;
        
        if (objectType?.id == "synbio.object-type.sample-designs") {
            filename = "SampleDesign.xlsm"
        } else if (objectType?.id == "synbio.object-type.strains") {
            filename = "Strain.xlsm"
        } else if (objectType?.id == "synbio.object-type.resources") {
            filename = "Resources.xlsm"
        } else if (objectType?.id == "synbio.object-type.study-data") {
            filename = "Assay.xlsm"
        } 

        const modalResult = await runDownloadTemplateWorkflow()

        if (!modalResult?.completed) {
            return
        }
        
        let jsonData
        try {
            jsonData = await readStudy(dirName);
        } catch (e) {
            showErrorNotification("Failed to read study file", e.message);
            return "Failed to read study file.";
        }
        
        const collectionUrl = jsonData.collectionUri
        const selectedRepo = jsonData.registryURL;
        const authToken = modalResult.authToken
        const registryAPI = dataSBH.find((repo) => repo.registryURL === selectedRepo)?.registryAPI || selectedRepo
                      
        if (!collectionUrl || !selectedRepo || !authToken) {
            showErrorNotification("Download aborted", "Missing repository, credentials, or collection selection.")
            return
        }

        try {
            const response = await download_template(registryAPI,authToken,collectionUrl,objectType?.id);
            const blob = new Blob([response.data], {
                type: "application/vnd.ms-excel.sheet.macroEnabled.12"
            });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch(error){
            showErrorNotification("Download Failed", error.message);
            return
        }
    }

    return(
        <Group sx={groupStyle} onClick={handleClick}>
            <FiDownload />
            <Text sx={textStyle} size="sm">
                Download Template
            </Text>
        </Group>

    )

}
    const groupStyle = (theme) => ({
        padding: "3px 0 3px 8px",
        borderRadius: 3,
        cursor: "pointer",
        color: getPrimaryColor(theme, 5),
        "&:hover": {
            backgroundColor: theme.colors.dark[5]
        }
    });

    const textStyle = (theme) => ({
        flexGrow: 1,
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        userSelect: "none",
        color: getPrimaryColor(theme, 5),
        fontWeight: 500
    });