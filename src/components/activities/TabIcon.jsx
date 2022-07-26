import { Tooltip, useMantineTheme } from '@mantine/core'
import { SVGIcon } from '../../icons'

export default function TabIcon({ icon, children }) {

    return (
        <Tooltip
            label={children}
            position="right"
            withArrow
            sx={() => ({ padding: '15px 14px' })}
        >
            <SVGIcon
                icon={icon}
                size={30}
            />
        </Tooltip>
    )
}
