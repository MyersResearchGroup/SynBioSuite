import { Box, Tabs, Title, Tooltip, Text } from '@mantine/core'
import { useActiveActivity, useActivities } from '../../redux/hooks/activityHooks'
import { getActivity, MicrosoftFileExplorer, MicrosoftStatus } from '../../activities'
import { SVGIcon } from '../../icons'
import SaveIndicatorDisplay from '../saveIndicatorDisplay'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useDispatch } from 'react-redux';
import { openMicrosoft, openModal } from '../../redux/slices/modalSlice';
import { msalInstance } from '../../microsoft-utils/auth/msalInit'

// constants for resizable sidebar
const MIN_PANEL_WIDTH = 180
const MAX_PANEL_WIDTH = 600
const DEFAULT_PANEL_WIDTH = 260
const STORAGE_KEY = "synbio.sidebar-panel-width"

export default function Activities() {

    // activity state
    const activities = useActivities()
    const [activeActivity, setActiveActivity] = useActiveActivity()
    const dispatch = useDispatch();

    // sidebar width state
    const [panelWidth, setPanelWidth] = useState(() => {
        const saved = Number(localStorage.getItem(STORAGE_KEY))
        return saved >= MIN_PANEL_WIDTH && saved <= MAX_PANEL_WIDTH
            ? saved
            : DEFAULT_PANEL_WIDTH
    })
    const isResizing = useRef(false);
    
    // start resizing
    const handleResizeStart = useCallback(e => {
        e.preventDefault();
        isResizing.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    // during the resize
    const handleResizeMove = useCallback(e => {
        if (!isResizing.current) return
        setPanelWidth(prev => {
            const next = prev + e.movementX
            return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, next))
        })
    }, [])

    // end the resize
    const handleResizeEnd = useCallback(() => {
        if (!isResizing.current) return
        isResizing.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        setPanelWidth(current => {
            localStorage.setItem(STORAGE_KEY, String(current))
            return current
        })
    }, [])

    useEffect(() => {
        window.addEventListener('mousemove', handleResizeMove)
        window.addEventListener('mouseup', handleResizeEnd)
        return () => {
            window.removeEventListener('mousemove', handleResizeMove)
            window.removeEventListener('mouseup', handleResizeEnd)
        }
    }, [handleResizeMove, handleResizeEnd])

    useEffect(() => {
        if (activeActivity == "synbio.activity.login-status-panel") {
            setActiveActivity("synbio.activity.local-file-explorer");
            dispatch(openModal());
        } else if (activeActivity === "synbio.activity.microsoft-status") {
            setActiveActivity("synbio.activity.microsoft-status");
            dispatch(openMicrosoft());
        } else {
            //dispatch(closeModal());
        }
    }, [activeActivity])

    // create tabs
    const tabs = Object.entries(activities).map(([activityId, activityState]) => {
        const activityDef = getActivity(activityId)
        return (
            <Tabs.Tab
                key={activityId}
                value={activityId}
                mt={activityDef.mt}
            >
                <Tooltip label={activityDef.title} color='gray' position="right" withArrow>
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
                <Title style={{display:"inline"}} order={6}>{activityDef.title}</Title>
                <Text style={{display:"inline"}} size={'xs'} ml={10}>
                    <SaveIndicatorDisplay/>
                </Text>
                <activityDef.component {...activityState} objectTypesToList = {activityDef.objectTypesToList} />
            </Tabs.Panel>
        )
    })

    // Conditionally render microsoft setting based on if the user is signed in.
    if(msalInstance.getActiveAccount()) {
        const msStatus = MicrosoftStatus;
        tabs.push(
            <Tabs.Tab
                key={msStatus.id}
                value={msStatus.id}
            >
                <Tooltip label={msStatus.title} color='gray' position="right" withArrow>
                    <Box py={15} px={14}>
                        <SVGIcon
                            icon={msStatus.icon}
                            size={30}
                        />
                    </Box>
                </Tooltip>
            </Tabs.Tab>
        )

        const OneDrivePanel = MicrosoftFileExplorer;
        tabs.unshift(
            <Tabs.Tab
                key={OneDrivePanel.id}
                value={OneDrivePanel.id}
            >
                <Tooltip label={OneDrivePanel.title} color='gray' position="right" withArrow>
                    <Box py={15} px={14}>
                        <SVGIcon
                            icon={OneDrivePanel.icon}
                            size={30}
                        />
                    </Box>
                </Tooltip>
            </Tabs.Tab>
        )

        tabPanels.unshift(
            <Tabs.Panel value={OneDrivePanel.id} key={OneDrivePanel.id}>
                <Title style={{display:"inline"}} order={6}>{OneDrivePanel.title}</Title>
                <Text style={{display:"inline"}} size={'xs'} ml={10}>
                    <SaveIndicatorDisplay/>
                </Text>
                <OneDrivePanel.component {...OneDrivePanel.activityState} objectTypesToList = {OneDrivePanel.objectTypesToList} />
            </Tabs.Panel>
        )
    }

    return (
        <div style={{ position: 'relative', display: 'flex' }}>
            <Tabs
                value={activeActivity}
                onTabChange={setActiveActivity}
                variant='unstyled'
                orientation='vertical'
                allowTabDeactivation={true}
                styles={theme => tabStyles(theme, panelWidth)}
            >
                <Tabs.List>
                    {tabs}
                </Tabs.List>
                {tabPanels}
            </Tabs>

            {activeActivity && (
                <div
                    onMouseDown={handleResizeStart}
                    style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        right: -3,
                        width: 6,
                        cursor: 'col-resize',
                        zIndex: 200,
                    }}
                />
            )}
        </div>
    )
}


const tabStyles = (theme, panelWidth) => {
    const dark = theme.colorScheme == 'dark'
    const activeColor = dark ? theme.other.activeColor : theme.colors.dark[8]

    return {
        tabsList: {
            backgroundColor: dark ? theme.colors.dark[5] : theme.colors.gray[4],
            maxHeight: '100vh'
        },
        tabActive: {

        },
        tab: {
            fill: dark ? theme.other.inactiveColor : theme.colors.gray[7],
            color: dark ? theme.other.inactiveColor : theme.colors.gray[7],
            padding: 0,
            height: 'auto',
            zIndex: 100,
            '&:hover': {
                fill: activeColor,
                color: activeColor
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
                color: activeColor,
                borderLeft: '3px solid ' + activeColor,
                '& svg': {
                    marginLeft: '-3px'
                }
            }
        },
        panel: {
            backgroundColor: dark ? theme.colors.dark[6] : theme.colors.gray[3],
            width: panelWidth,
            padding: '10px 6px 24px 6px',
            position: 'relative',
        },
    }
}