import { useEffect, useState } from "react";
import { Text } from "@mantine/core";
// Elements within this component will be unrendered after a specified delay
export default function Expire({delay, children}){
    const [visible, setVisible] = useState(true)

    useEffect(() =>{
        setTimeout(() =>{
            setVisible(false)
        }, delay)
    }, [])

    return(
       <>
            {visible && children}
       </>
    )
}