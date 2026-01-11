import { Group, Text } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { getPrimaryColor } from "../../../modules/colorScheme";
import { AiOutlineDownload } from "react-icons/ai";

export default function DownloadMetadata() {
    
    const handleClick = async () => {
        const url = "/Template.xlsm";
        const filename = "Template.xlsm";

        if (true) {
            showNotification({
                message: "No template has been made available at this time.",
                color: "red"
            })
            return;
        }

        try {
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement("a");
        
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
            }
            catch(error){
                window.open(url, '_blank');
            }
    }

    return(
        <Group sx={groupStyle} onClick={handleClick}>
            <AiOutlineDownload />
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