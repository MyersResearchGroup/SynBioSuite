import { Text } from "@mantine/core";
import Expire from "./Expire";
import { useSelector } from "react-redux";
export default function SaveIndicatorDisplay() {
    const isSaving = useSelector(state => state.saveIndicator.isSaving)
    return (
        <>
            {isSaving ? 
                <Text ml={100} sx={{ display: "inline" }}>
                    Saving...
                </Text>
                : 
                <Expire delay={3000}>
                    <Text ml={100} sx={{ display: "inline" }}>
                        Saved
                    </Text>
                </Expire>
            }
        </>
    );
}
