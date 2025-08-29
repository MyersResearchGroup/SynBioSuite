import { getObjectType } from "../../../objectTypes"
import { Group, Text } from "@mantine/core";
import { getPrimaryColor } from "../../../modules/colorScheme";
import { AiOutlineDownload, AiOutlinePlus } from "react-icons/ai";

export default function DownloadMetadata({ objectType}) {
    
    const handleClick = async () => {

        let url, fileName;
        //categorize the object type
        if (objectType?.id == "synbio.object-type.chassis") {
            url = "/Tricahue_v11.6b_Chassis.xlsm"
            fileName = "Tricahue_v11.6b_Chassis.xlsm"
        } else if (objectType?.id == "synbio.object-type.chemicals") {
            url = "/Tricahue_v11.6b_Chemicals.xlsm"
            fileName = "Tricahue_v11.6b_Chemicals.xlsm"
        } else if (objectType?.id == "synbio.object-type.medias") {
            url = "/Tricahue_v11.6b_Medias.xlsm"
            fileName = "Tricahue_v11.6b_Medias.xlsm"
        } else if (objectType?.id == "synbio.object-type.sample-designs") {
            url = "/Tricahue_SampleDesign.xlsm"
            fileName = "Tricahue_SampleDesign.xlsm"
        } else if (objectType?.id == "synbio.object-type.strains") {
            url = "/Tricahue_Strain.xlsm"
            fileName = "Tricahue_Strain.xlsm"
        }


        if (url && fileName) {
            try{
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
            }
            catch(error){
                window.open(url, '_blank');
            }
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