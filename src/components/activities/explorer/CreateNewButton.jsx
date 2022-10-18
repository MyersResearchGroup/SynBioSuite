import { Group, Text, TextInput } from '@mantine/core'
import { useClickOutside } from '@mantine/hooks'
import { useState } from 'react'
import { AiOutlinePlus } from "react-icons/ai"
import { getPrimaryColor } from '../../../modules/colorScheme'
import { useSafeName } from '../../../redux/hooks/workingDirectoryHooks'

export default function CreateNewButton({ onCreate, children, suggestedName }) {

    const [creating, setCreating] = useState(false)

    // use a safe name
    const safeName = useSafeName(suggestedName)

    // stop creating if there's a click outside the input
    const clickOutsideRef = useClickOutside(() => setCreating(false))

    // handle key presses, namely Escape and Enter
    const keyDownHandler = event => {
        switch (event.code) {
            case "Escape": setCreating(false)
                break
            case "Enter":
                const proposedTitle = clickOutsideRef.current.value.trim()
                setCreating(false)
                proposedTitle && onCreate(proposedTitle)
                break
        }
    }

    // select text in input on focus -- this will auto-highlight
    // the default value provided in the text input
    const focusHandler = event => {
        event.target.select()
    }

    return (
        <Group
            sx={groupStyle}
            onClick={() => setCreating(true)}
        >
            <AiOutlinePlus />
            {creating ?
                <TextInput
                    size="sm"
                    autoFocus={true}
                    ref={clickOutsideRef}
                    onKeyDownCapture={keyDownHandler}
                    onFocusCapture={focusHandler}
                    defaultValue={safeName()}
                /> :
                <Text size='sm' sx={textStyle}>{children}</Text>}
        </Group>
    )
}

const groupStyle = theme => ({
    padding: '3px 0 3px 8px',
    borderRadius: 3,
    cursor: 'pointer',
    color: getPrimaryColor(theme, 5),
    '&:hover': {
        backgroundColor: theme.colors.dark[5]
    }
})

const textStyle = theme => ({
    flexGrow: 1,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    color: getPrimaryColor(theme, 5),
    fontWeight: 500,
})