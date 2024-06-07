import { CgCheckO } from "react-icons/cg";
import Expire from "./Expire";
import { useSelector } from "react-redux";
import { MdDataSaverOff } from "react-icons/md";

export default function SaveIndicatorDisplay() {
    const isSaving = useSelector(state => state.saveIndicator.isSaving)
    return (
        <>
            {isSaving ? 
                <span>
                    Saving
                    <MdDataSaverOff color="#FFFF00" style={{marginLeft: "5px"}}/>
                </span>
                : 
                <Expire delay={3000}>
                    Saved
                    <CgCheckO style={{marginLeft: "5px"}} color='green'/>
                </Expire>
            }
        </>
    );
}
