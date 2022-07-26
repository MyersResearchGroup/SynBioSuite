import { Center, InputWrapper as MantineInputWrapper } from '@mantine/core'


export default function InputWrapper({ children, ...props }) {
    return (
        <Center>
            <MantineInputWrapper {...props} styles={inputWrapperStyles} >
                {children}
            </MantineInputWrapper>
        </Center>
    )
}

const inputWrapperStyles = theme => ({
    root: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    label: {
        marginRight: 20,
        textAlign: 'right',
        width: 120
    }
})