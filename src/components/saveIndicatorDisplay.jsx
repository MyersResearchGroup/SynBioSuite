import { CgCheckO } from "react-icons/cg";
import Expire from "./Expire";
import { useSelector } from "react-redux";
export default function SaveIndicatorDisplay() {
    const isSaving = useSelector(state => state.saveIndicator.isSaving)
    return (
        <>
            {isSaving ? 
                "Saving..."
                : 
                <Expire delay={3000}>
                    Saved
                    <CgCheckO style={{marginLeft: "5px"}} color='green'/>
                </Expire>
            }
        </>
    );
}
