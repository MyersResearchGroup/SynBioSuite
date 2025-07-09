import { getObjectType } from "../../../objectTypes"
import { Group, Text } from "@mantine/core";
import { getPrimaryColor } from "../../../modules/colorScheme";
import { AiOutlinePlus } from "react-icons/ai";

export default function DownloadMetadata({ objectType}) {

    // const objectType = getObjectType()
    
    const handleClick = async () => {

        let url, fileName;

        if (objectType?.id == "synbio.object-type.experimental-data-chassis") {
            url = "/Tricahue_v11.6b_Chassis.xlsm"
            fileName = "Tricahue_v11.6b_Chassis.xlsm"
        } else if (objectType?.id == "synbio.object-type.experimental-data-chemical") {
            url = "/Tricahue_v11.6b_Chemicals.xlsm"
            fileName = "Tricahue_v11.6b_Chemicals.xlsm"
        } else if (objectType?.id == "synbio.object-type.experimental-data-medias") {
            url = "/Tricahue_v11.6b_Medias.xlsm"
            fileName = "Tricahue_v11.6b_Medias.xlsm"
        } else if (objectType?.id == "synbio.object-type.experimental-data-sample-designs") {
            url = "/Tricahue_SampleDesign.xlsm"
            fileName = "Tricahue_SampleDesign.xlsm"
        } else if (objectType?.id == "synbio.object-type.experimental-data-strains") {
            url = "/Tricahue_Strain.xslm"
            fileName = "Tricahue_Strain.xslm"
        }


        if (url && fileName) {
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

    }
    return(
        <Group sx={groupStyle} onClick={handleClick}>
            <AiOutlinePlus />
            <Text sx={textStyle} size="sm">
                Donwload Template
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