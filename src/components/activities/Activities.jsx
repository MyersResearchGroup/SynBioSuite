import { Box, Tabs, Title, Tooltip } from '@mantine/core'
import { useActiveActivity, useActivities } from '../../redux/hooks/activityHooks'
import { getActivity } from '../../activities'
import { SVGIcon } from '../../icons'
import { FaBug } from "react-icons/fa";

export default function Activities() {

    // activity state
    const activities = useActivities()
    const [activeActivity, setActiveActivity] = useActiveActivity()

    // create tabs
    const tabs = Object.entries(activities).map(([activityId, activityState]) => {
        const activityDef = getActivity(activityId)
        return (
            <Tabs.Tab
                key={activityId}
                value={activityId}
            >
                <Tooltip label={activityDef.title} position="right" withArrow>
                    <Box py={15} px={14}>
                        <SVGIcon
                            icon={activityDef.icon}
                            size={30}
                        />
                    </Box>
                </Tooltip>
            </Tabs.Tab>
        )
    })

    // create tab panels
    const tabPanels = Object.entries(activities).map(([activityId, activityState]) => {
        const activityDef = getActivity(activityId)
        return (
            <Tabs.Panel value={activityId} key={activityId}>
                <Title order={6}>{activityDef.title}</Title>
                <activityDef.component {...activityState} />
            </Tabs.Panel>
        )
    })

    return (
        <Tabs
            value={activeActivity}
            onTabChange={setActiveActivity}
            variant='unstyled'
            orientation='vertical'
            allowTabDeactivation={true}
            styles={tabStyles}
        >
            <Tabs.List>
                {tabs}

                <Tooltip label="Report Bug" position='right' withArrow>

                    <Tabs.Tab value='report-bug' mt='auto'>
                        <Box py={15} px={14}>
                            <FaBug size={30}/>
                        </Box>
                    </Tabs.Tab>
                </Tooltip>
            </Tabs.List>

            <Tabs.Panel value='report-bug'>
                hello
            </Tabs.Panel>
            {tabPanels}
        </Tabs>
    )
}


const tabStyles = theme => {
    const dark = theme.colorScheme == 'dark'
    const activeColor = dark ? theme.other.activeColor : theme.colors.dark[8]

    return {
        tabsList: {
            backgroundColor: dark ? theme.colors.dark[5] : theme.colors.gray[4],
            minHeight: '100vh'
        },
        tabActive: {

        },
        tab: {
            fill: dark ? theme.other.inactiveColor : theme.colors.gray[7],
            padding: 0,
            height: 'auto',
            zIndex: 100,
            '&:hover': {
                fill: activeColor
            },
            '&.addDivider::after': {
                content: '""',
                display: 'block',
                width: '85%',
                height: 1,
                backgroundColor: theme.colors.dark[4],
                margin: '0 auto'
            },
            '&[data-active]': {
                fill: activeColor,
                borderLeft: '3px solid ' + activeColor,
                '& svg': {
                    marginLeft: '-3px'
                }
            }
        },
        panel: {
            backgroundColor: dark ? theme.colors.dark[6] : theme.colors.gray[3],
            width: 260,
            padding: '10px 6px 24px 6px',
            position: 'relative',
        },
    }
}