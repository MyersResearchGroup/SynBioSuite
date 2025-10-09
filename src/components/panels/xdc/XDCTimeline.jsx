import { Accordion, Container, Text, Timeline, CopyButton, ActionIcon, Tooltip} from '@mantine/core'
import React, { useContext, useEffect, useState } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { PanelContext } from './CollectionPanel'
import { RuntimeStatus } from '../../../runtimeStatus'
import { useSelector } from 'react-redux'
import { FaRegClipboard, FaClipboardCheck } from "react-icons/fa";
import { IoEllipsisHorizontalSharp, IoCheckmarkSharp, IoCloudUpload } from "react-icons/io5"
import { BsFileEarmarkCheckFill } from "react-icons/bs";
import { SiMicrogenetics } from "react-icons/si";
import { FaHourglassStart } from "react-icons/fa6";
import { IoMdClose } from "react-icons/io"

export default function XDCTimeline({status}) {
    const failureMessage = useSelector(state => state.failureMessage.message)

    const [running, setRunning] = useState(RuntimeStatus.running(status))
    const [successful, setSuccessful] = useState(RuntimeStatus.successful(status))
    const [unsuccessful, setUnsuccessful] = useState(RuntimeStatus.unsuccessful(status))
    
    useEffect(() => {
        setRunning(RuntimeStatus.running(status))
        setSuccessful(RuntimeStatus.successful(status))
        setUnsuccessful(RuntimeStatus.unsuccessful(status))
    }, [status])

    const timelineNodes = [
        <Timeline.Item title="Not Started" bullet={<FaHourglassStart />} key="not">
        <Text color="dimmed" size="sm">The process has not started yet</Text>
        </Timeline.Item>,

        <Timeline.Item title="Processing Data" bullet={<BsFileEarmarkCheckFill />} key="processing">
            <Text color="dimmed" size="sm">Your files are being processed by the server</Text>
        </Timeline.Item>,

        <Timeline.Item title="Uploading" bullet={<SiMicrogenetics />} key="uploading">
            <Text color="dimmed" size="sm">Your files are being uploaded by the server</Text>
        </Timeline.Item>,
    ]
        
    const nodesToShow = statusToNodesMap[status]?.map(nodeIndex => timelineNodes[nodeIndex])
    const activeNode = nodesToShow?.length - (running ? 1 : 0)

    return (
        status && nodesToShow ?
            <>
            <Container pt={15} style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                <Timeline
                    active={activeNode}
                    bulletSize={24}
                    lineWidth={2}
                >
                    {nodesToShow}

                    {running &&
                        <Timeline.Item bullet={<IoEllipsisHorizontalSharp />} key="dot" mb={40}>
                        </Timeline.Item>}

                    {successful &&
                        <Timeline.Item title="Completed" color="green" bullet={<IoCheckmarkSharp />} sx={pushTitleDownStyles} key="com">
                        </Timeline.Item>}

                    {unsuccessful &&
                        <Timeline.Item title={
                            <Accordion styles={accordionStyles} transitionDuration={0}>
                                <Accordion.Item value="customization">
                                    <Accordion.Control><b style={textStyle}>Failed</b></Accordion.Control>
                                    <Accordion.Panel>
                                        <CopyButton value={failureMessage} timeout={2000}>
                                            {({ copied, copy }) => (
                                                <Tooltip label={copied ? 'Copied' : 'Copy Message'} withArrow position="right">
                                                    <ActionIcon
                                                        mb={5}
                                                        style={!copied ? actionIconOpacity : null}
                                                        variant='outline' color={copied ? 'teal' : 'gray'}
                                                        onClick={copy}>
                                                        {copied ? <FaClipboardCheck size="1rem" /> : <FaRegClipboard size="1rem" />}
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}
                                        </CopyButton>
                                        {failureMessage}
                                    </Accordion.Panel>
                                </Accordion.Item>
                            </Accordion>}
                            color="red" bullet={<IoMdClose />} sx={pushTitleDownStyles} key="fai">
                        </Timeline.Item>
                    }
                </Timeline>
            </Container>
            </>
            :
            <></>
    )
}

const statusToNodesMap = {
    [RuntimeStatus.WAITING]: [0],
    [RuntimeStatus.PROCESSING]: [1],
    [RuntimeStatus.UPLOADING]: [1,2],
    [RuntimeStatus.FAILED]: [0],
    [RuntimeStatus.COMPLETED]: [1, 2],
    [RuntimeStatus.CANCELLED]: [1, 2],
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
        transform: 'translateY(-17px) translateX(-8px)',
    },
    panel: {
        paddingTop: '0px'
    }
})

const actionIconOpacity = {
    borderColor: "rgba(255, 255, 255, .3)" 
}

const textStyle = {
    fontWeight: 500,
    marginLeft: "9px"
}
const lastRunTitleStyle = theme => ({
    marginBottom: 10,
    color: theme.other.inactiveColor
})
