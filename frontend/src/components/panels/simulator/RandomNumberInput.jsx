import { ActionIcon, Box, Center, Kbd, NumberInput, Text, Tooltip } from '@mantine/core'
import { useEffect } from 'react'
import { useRef } from 'react'
import { TbArrowsRandom } from "react-icons/tb"


export default function RandomNumberInput({ digits = 5, ...props }) {

    const inputRef = useRef()

    // generate random value when Space is pressed
    const handleKeyUp = event => {
        if (event.code == "Enter") {
            event.preventDefault()
            event.stopPropagation()
            const random = Math.round(Math.random() * 10 ** digits)
            inputRef.current.value = random
        }
    }

    return (
        <Tooltip sx={{
            display: 'block'
        }} label={
            <Center>Press <Kbd mx={5}>Enter</Kbd> for random</Center>
        } position="bottom">
            <NumberInput {...props} onKeyUpCapture={handleKeyUp} ref={inputRef} icon={
                <TbArrowsRandom />
            } />
        </Tooltip>
    )
}
