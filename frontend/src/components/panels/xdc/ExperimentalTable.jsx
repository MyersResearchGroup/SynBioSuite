import { Container, Group, Table, Text } from '@mantine/core'
import { useContext, useRef, useState, useEffect } from 'react'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { titleFromFileName, useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { PanelContext } from './CollectionPanel'
import { FaCaretRight } from "react-icons/fa";

const tableContainerStyle = {
    position: 'relative',
    overflowY: 'scroll',
    overflowX: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: '#ccc #f5f5f5',
}

const cellStyle = {
    whiteSpace: 'nowrap',
}

const bounceArrowStyle = {
    position: 'absolute',
    top: '50%',
    right: 8,
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    borderRadius: '50%',
    zIndex: 2,
    animation: 'bounceArrow .4s infinite',
}

export default function ExperimentalTable() {

    const panelId = useContext(PanelContext)

    const [metadataID, setMetadataID] = usePanelProperty(panelId, 'metadata', false)
    const metadataFile = useFile(metadataID)
    
    const [resultsID, setResultsID] = usePanelProperty(panelId, 'results', false)
    const resultsFile = useFile(resultsID)

    const [plateOutputID, setPlateOutputID] = usePanelProperty(panelId, 'plateOutput', false)
    const plateOutputFile = useFile(plateOutputID)

    const [collection, setCollection] = usePanelProperty(panelId, 'collection', false, {})


    const containerRef = useRef(null)
    const [showArrow, setShowArrow] = useState(false)
    const [arrowDismissed, setArrowDismissed] = useState(false)

    // Detects if the table is overflowing and shows arrow accordingly
    useEffect(() => {
        const checkOverflow = () => {
            const el = containerRef.current
            if (el && !arrowDismissed) {
                setShowArrow(el.scrollWidth > el.clientWidth && el.scrollLeft === 0)
            }
        }
        checkOverflow()
        window.addEventListener('resize', checkOverflow)
        return () => window.removeEventListener('resize', checkOverflow)
    }, [arrowDismissed])

    // Hide permanently arrow if the user scrolls
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const handleScroll = () => {
            if (el.scrollLeft > 0) {
                setArrowDismissed(true)
                setShowArrow(false)
            }
        }
        el.addEventListener('scroll', handleScroll)
        return () => el.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <Container>
            <style>
                {`
                @keyframes bounceArrow {
                    0%, 100% { transform: translateY(-50%) translateY(0); }
                    50% { transform: translateY(-50%) translateY(8px); }
                }
                `}
            </style>
            <div ref={containerRef} style={tableContainerStyle}>
                {showArrow && (
                    <div style={bounceArrowStyle}>
                        <FaCaretRight size={24} color="#3b5bdb" />
                    </div>
                )}
                <Table horizontalSpacing={20}>
                    <thead>
                        <tr>
                            <th style={cellStyle}></th>
                            <th style={cellStyle}></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={cellStyle}>
                                <Text weight={600}>Metadata:</Text>
                            </td>
                            <td style={cellStyle}>
                                <Group>
                                    <Text weight={600}>{titleFromFileName(metadataFile?.name)}</Text>
                                </Group>
                            </td>
                        </tr>
                        {resultsFile ? (
                            <tr>
                                <td style={cellStyle}>
                                    <Text weight={600}>Results:</Text>
                                </td>
                                <td style={cellStyle}>
                                    <Group>
                                        <Text weight={600}>{titleFromFileName(resultsFile?.name)}</Text>
                                    </Group>
                                </td>
                            </tr>
                        ) : null}
                        {plateOutputFile ? (
                            <tr>
                                <td style={cellStyle}>
                                    <Text weight={600}>Plate Reader:</Text>
                                </td>
                                <td style={cellStyle}>
                                <Group>
                                    <Text weight={600}>{titleFromFileName(plateOutputFile?.name)}</Text>
                                </Group>
                                </td>
                            </tr>
                        ) : null}
                        <tr>
                            <td style={cellStyle}>
                                <Text weight={600}> Collection Name:</Text>
                            </td>
                            <td style={cellStyle}>
                                <Group>
                                    <Text weight={600}>{collection.name}</Text>
                                </Group>
                            </td>
                        </tr>
                        <tr>
                            <td style={cellStyle}>
                                <Text weight={600}> Collection Link:</Text>
                            </td>
                            <td style={cellStyle}>
                                <Group>
                                    <a href={collection.uri} target="_blank" rel="noopener noreferrer">
                                            <Text weight={600} component="span" style={{ color: '#228be6', textDecoration: 'underline' }}>
                                            {collection.uri}
                                        </Text>
                                    </a>
                                </Group>
                            </td>
                        </tr>
                        <tr>
                            <td style={cellStyle}><Text weight={600}> Version:</Text></td>
                            <td style={cellStyle}>
                                <Group>
                                    <Text weight={600}>{collection.version}</Text>
                                </Group>
                            </td>
                        </tr>
                    </tbody>
                </Table>
            </div>
        </Container>
    )
}