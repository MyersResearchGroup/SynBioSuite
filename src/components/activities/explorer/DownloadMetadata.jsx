import { getObjectType } from "../../../objectTypes"
import { Group, Text } from "@mantine/core";
import { getPrimaryColor } from "../../../modules/colorScheme";
import { AiOutlinePlus } from "react-icons/ai";

export default function DownloadMetadata({ objectType}) {

    // const objectType = getObjectType()
    
    const handleClick = async () => {

        let url, fileName;

        if (objectType?.id == "synbio.object-type.experimental-data-chassis") {
            url = "https://o365coloradoedu-my.sharepoint.com/:x:/g/personal/kesc9143_colorado_edu/EexhkRIe8ZBOuN4yVP2fyjcBaJSH1Tk04oTEvtjJlf5CBQ?email=Kenzo.Schwab%40colorado.edu&e=KDkuhb"
            fileName = "Tricahue_v11.6b_Chassis.xlsm"
        } else if (objectType?.id == "synbio.object-type.experimental-data-chemical") {
            url = "https://o365coloradoedu-my.sharepoint.com/:x:/g/personal/kesc9143_colorado_edu/EYrLIbU1TE5CvIDZyQ5TUcABZdlJDmSc38p3ZUAJprA5_g?email=Kenzo.Schwab%40colorado.edu&e=qrlxVl"
            fileName = "Tricahue_v11.6b_Chemicals.xlsm"
        } else if (objectType?.id == "synbio.object-type.experimental-data-medias") {
            url = "https://o365coloradoedu-my.sharepoint.com/:x:/g/personal/kesc9143_colorado_edu/EZatxuZgD8lMp3WSCoy42toBPKZt24zsYV7Vy_4YzPveMg?email=Kenzo.Schwab%40colorado.edu&e=sg2LWr"
            fileName = "Tricahue_v11.6b_Medias.xlsm"
        } else if (objectType?.id == "synbio.object-type.experimental-data-sample-designs") {
            url = "https://o365coloradoedu-my.sharepoint.com/:x:/g/personal/kesc9143_colorado_edu/EdfXrJ8iz8ZDsZBe0r332fIBGQDu38TOzFsc-rvTn76kuw?email=Kenzo.Schwab%40colorado.edu&e=reRvda"
            fileName = "Tricahue_SampleDesign.xlsm"
        } else if (objectType?.id == "synbio.object-type.experimental-data-strains") {
            url = "https://o365coloradoedu-my.sharepoint.com/:x:/g/personal/kesc9143_colorado_edu/EVzbqSXPBHxEhI1xI-tDw08BZCaS3Gi1Q9_8fBjg99Zakg?email=Kenzo.Schwab%40colorado.edu&e=u1va1h"
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