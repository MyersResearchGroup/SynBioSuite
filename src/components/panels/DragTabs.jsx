import { useState, useRef, useEffect } from "react"
import { Text, Tabs } from '@mantine/core'
import { useSelector } from 'react-redux'


export default function DragTabs({
    tabComponent: TabComponent,
    contentComponent: ContentComponent,
    tabIds,
    active,
    onSelect,
    onReorder
}) {

    // drag states
    const tabRefs = useRef([])
    const [dragState, setDragState] = useState()

    // update tab refs
    useEffect(() => {
        tabRefs.current = tabRefs.current.slice(0, tabIds.length)
    }, [tabIds])


    // drag handlers

    const handleMouseDown = (id, index) => event => {
        if (event.button == 0) {
            dragState ?
                handleMouseLeave() :
                setDragState({
                    id,
                    index,
                    start: [event.clientX, event.clientY],
                    width: tabRefs.current[index].clientWidth
                })
        }
    }

    const handleMouseMove = event => {
        if (dragState) {

            // handle what happens when tab is closed
            if (!tabIds.includes(dragState.id)) {
                handleMouseLeave()
                return
            }

            const diffX = event.clientX - dragState.start[0]
            const diffY = Math.abs(event.clientY - dragState.start[1])

            // calculate new position and clamp to array bounds
            const newPos = Math.max(
                Math.min(
                    Math.round(diffX / dragState.width + dragState.index),
                    tabRefs.current.length - 1
                ),
                0
            )

            // update position of tab
            const transform = Math.max(diffX, -dragState.index * dragState.width)   // clip to left edge
            tabRefs.current[dragState.index].style.transform = `translateX(${transform}px)`
            tabRefs.current[dragState.index].style.zIndex = 1000

            // transform other tabs
            const proposedOrder = []
            tabRefs.current.forEach((_, i) => i != dragState.index && proposedOrder.push(i))
            proposedOrder.splice(newPos, 0, dragState.index)    // splice in dragged item
            proposedOrder.forEach((originalIndex, newIndex) => {
                if (originalIndex != dragState.index) {
                    const transform = (newIndex - originalIndex) * dragState.width
                    tabRefs.current[originalIndex].style.transform = `translateX(${transform}px)`
                }
            })

            // drag has gone too far off axis
            diffY > 100 && handleMouseLeave()

            setDragState({ ...dragState, newPos })
        }
    }

    const handleMouseLeave = event => {
        if (dragState) {
            tabRefs.current.forEach(element => element.style.transform = 'none')
            tabRefs.current[dragState.index] &&
                (tabRefs.current[dragState.index].style.zIndex = 1)
        }
        setDragState(null)
    }

    const handleMouseUp = event => {
        if (dragState) {
            if (dragState.newPos != null)
                // this is a drag; items should be reordered
                onReorder({
                    from: dragState.index,
                    to: dragState.newPos,
                })
            else {
                // this is a click; item should be selected
                const id = tabIds[tabRefs.current.findIndex(
                    el => el.contains(event.target) || el == event.target
                )]
                onSelect(id)
            }

            handleMouseLeave()
        }
    }

    // clear drag state if all tabs are closed
    useEffect(() => {
        !tabIds.length && setDragState(null)
    }, [tabIds.length])

    
    return (
        !!tabIds.length &&
            <div
                style={containerStyle}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}>
                <Tabs variant="outline" styles={tabsStyles} value={active} >
                    <Tabs.List>
                        {tabIds.map((id, i) =>
                            <TabComponent
                                id={id}
                                key={id}
                                onMouseDown={handleMouseDown(id, i)}
                                ref={el => tabRefs.current[i] = el}
                            />
                        )}
                    </Tabs.List>
                    {tabIds.map(id =>
                        <ContentComponent id={id} key={id} />
                    )}
                </Tabs>
            </div>
    )
}

const containerStyle = {
    minHeight: '100vh'
}

const scrollBarWidth = 8

const tabsStyles = theme => ({
    tabsList: {
        paddingLeft: 10,
        paddingTop: 5,
        whiteSpace: 'nowrap',
        display: 'block',
    },
    tab: {
        padding: 0,
        display: 'inline-block',
        position: 'relative',
        backgroundColor: theme.colors.dark[7],
        '&:hover': {
            backgroundColor: theme.colors.dark[6]
        },
        '&[data-active]': {
            borderColor: theme.colors.dark[3] + ' !important',
            backgroundColor: theme.colors.dark[6] + ' !important',
        }
    },
    panel: {
        padding: 0
    },
    tabsListWrapper: {
        overflowX: 'scroll',    // fallback
        overflowX: 'overlay',
        overflowY: 'hidden',

        // scrollbar styles

        '&::-webkit-scrollbar': {
            display: 'block',
            height: scrollBarWidth
        },

        '&::-webkit-scrollbar-button': {
            display: 'none'
        },

        '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
        },

        '&::-webkit-scrollbar-track-piece': {
            backgroundColor: 'transparent'
        },

        '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'transparent',
            borderRadius: scrollBarWidth / 2,
        },

        '&:hover::-webkit-scrollbar-thumb': {
            backgroundColor: theme.colors.dark[4],
        }
    }
})