import { Center, Input } from '@mantine/core'


export default function InputWrapper({ children, ...props }) {
    return (
        <Center>
            <Input.Wrapper {...props} styles={inputWrapperStyles} >
                {children}
            </Input.Wrapper>
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