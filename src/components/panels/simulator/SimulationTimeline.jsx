import { Accordion, Container, Text, Timeline, Title } from '@mantine/core'
import React, { useContext } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { PanelContext } from './SimulatorPanel'
import ReactTimeAgo from 'react-time-ago'
import { RuntimeStatus } from '../../../runtimeStatus'

import { BsDisplay, BsQuestion } from "react-icons/bs"
import { IoEllipsisHorizontalSharp, IoCheckmarkSharp } from "react-icons/io5"
import { IoMdClose } from "react-icons/io"
import { TiInputChecked } from "react-icons/ti"
import { AiOutlineDoubleRight } from "react-icons/ai"
import { BiRun } from "react-icons/bi"


export default function SimulationTimeline() {

    const panelId = useContext(PanelContext)
    const status = usePanelProperty(panelId, "runtimeStatus")
    const requestedAt = usePanelProperty(panelId, "lastRequestedAt")

    const running = RuntimeStatus.running(status)
    const successful = RuntimeStatus.successful(status)
    const unsuccessful = RuntimeStatus.unsuccessful(status)

    const timelineNodes = [
        <Timeline.Item title="Analysis requested" bullet={<BsQuestion />} key="req">
            <Text color="dimmed" size="sm">Your request has been sent to the iBioSim server.</Text>
            {requestedAt && <Text size="xs" mt={4}>
                <ReactTimeAgo date={requestedAt} locale="en-US" />
            </Text>}
        </Timeline.Item>,

        <Timeline.Item title="Accepted" bullet={<TiInputChecked />} key="acc">
            <Text color="dimmed" size="sm">Your analysis has been accepted by the server.</Text>
        </Timeline.Item>,

        <Timeline.Item title="Pending" bullet={<AiOutlineDoubleRight />} key="pen">
            <Text color="dimmed" size="sm">Your analysis has been queued.</Text>
        </Timeline.Item>,

        <Timeline.Item title="Running" bullet={<BiRun />} key="run">
            <Text color="dimmed" size="sm">Your analysis is running.</Text>
        </Timeline.Item>,
    ]

    const nodesToShow = statusToNodesMap[status]?.map(nodeIndex => timelineNodes[nodeIndex])
    const activeNode = nodesToShow?.length - (running ? 1 : 0)

    return (
        status && nodesToShow ?
            <Container pt={15}>
                {/* {!running &&
                    <Title order={5} sx={lastRunTitleStyle}>Last Run</Title>} */}
                <Timeline
                    active={activeNode}
                    bulletSize={24}
                    lineWidth={2}
                // color={running ? 'blue' : successful ? 'green' : 'red'}
                >
                    {nodesToShow}

                    {running &&
                        <Timeline.Item bullet={<IoEllipsisHorizontalSharp />} key="dot" mb={40}>
                        </Timeline.Item>}

                    {successful &&
                        <Timeline.Item title="Completed" color="green" bullet={<IoCheckmarkSharp />} sx={pushTitleDownStyles} key="com">
                        </Timeline.Item>}

                    {unsuccessful &&
                        <Timeline.Item title= {
                            <Accordion styles={accordionStyles} transitionDuration={0}>
                                <Accordion.Item value="customization">
                                    <Accordion.Control><b style={{fontWeight: 500}}>Failed</b></Accordion.Control>
                                    <Accordion.Panel style={{paddingLeft: "0px"}}></Accordion.Panel>
                                </Accordion.Item>
                            </Accordion>} 

                            color="red" bullet={<IoMdClose />} sx={pushTitleDownStyles} key="fai">
                            </Timeline.Item>}
                </Timeline>
            </Container> :
            <></>
    )
}

const statusToNodesMap = {
    [RuntimeStatus.REQUESTED]: [0],
    [RuntimeStatus.ACCEPTED]: [0, 1],
    [RuntimeStatus.PENDING]: [0, 1, 2],
    [RuntimeStatus.RUNNING]: [0, 1, 2, 3],
    [RuntimeStatus.CANCELLED]: null,
    [RuntimeStatus.FAILED]: [0, 1, 2, 3],
    [RuntimeStatus.COMPLETED]: [0, 1, 2, 3],
}

const pushTitleDownStyles = theme => ({
    '& .mantine-Timeline-itemTitle': {
        transform: 'translateY(3px)', 
    
    }
})

const accordionStyles = theme => ({
    control: {
        paddingLeft: '0px',
        borderRadius: 4,
    },
    item: {
        transform: 'translateY(-17px)',
    },
    panel: {
        padding: '0px'
    }
})
const lastRunTitleStyle = theme => ({
    marginBottom: 10,
    color: theme.other.inactiveColor
})