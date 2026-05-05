import { Group, Text } from "@mantine/core";
import { AiOutlinePlus } from "react-icons/ai";
import { getPrimaryColor } from "../../../modules/colorScheme";
import { useDispatch } from "react-redux";
import { panelsSlice } from "../../../redux/store.js";

const { actions } = panelsSlice;
const SEQ_IMPROVE_PANEL_ID = "seqimprove-panel";

export default function OpenSeqImproveButton({ text, url }) {
    const dispatch = useDispatch();

    const handleClick = () => {
        dispatch(actions.openPanel({
            id: SEQ_IMPROVE_PANEL_ID,
            type: "synbio.panel-type.seqimprove",
            url: url,
            name: "SeqImprove",
        }));
    };

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

    return (
        <Group sx={groupStyle} onClick={handleClick}>
            <AiOutlinePlus />
            <Text size="sm" sx={textStyle}>
                {text}
            </Text>
        </Group>
    );
}
