import { Tabs, Title } from '@mantine/core'
import TabIcon from './TabIcon'
import { useActiveActivity, useActivityStates } from '../../redux/slices/activitySlice'
import { getActivity } from '../../activities'


export default function Activities() {

    // activity state
    const [activities] = useActivityStates()
    const [activeActivity, setActiveActivity] = useActiveActivity()

    // create tabs
    const tabs = Object.entries(activities).map(([activityId, activityState]) => {

        const activityDef = getActivity(activityId)

        return {
            activityId,
            component:
                <Tabs.Tab
                    key={activityId}
                    icon={<TabIcon icon={activityDef.icon} >{activityDef.title}</TabIcon>}
                >
                    <Title order={6}>{activityDef.title}</Title>
                    <activityDef.component {...activityState} />
                </Tabs.Tab>
        }
    })

    // find active tab index
    const activeTabIndex = tabs.find(tab => tab.activityId == activeActivity)

    // handle tab change
    const handleTabChange = index => setActiveActivity(tabs[index].activityId)

    return (
        <Tabs
            active={activeTabIndex}
            onTabChange={handleTabChange}
            variant='unstyled'
            orientation='vertical'
            tabPadding='xl'
            styles={tabStyles}
        >
            {tabs.map(tab => tab.component)}
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
            fill: activeColor,
            borderLeft: '3px solid ' + activeColor,
            '& svg': {
                marginLeft: '-3px'
            }
        },
        tabControl: {
            fill: dark ? theme.other.inactiveColor : theme.colors.gray[7],
            padding: 0,
            height: 'auto',
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
        },
        body: {
            backgroundColor: dark ? theme.colors.dark[6] : theme.colors.gray[3],
            width: 260,
            padding: '10px 6px 24px 6px'
        }
    }
}