import { Badge, Container, Group, Table, Text } from '@mantine/core'
import { useContext } from 'react'
import { getObjectType } from '../../../objectTypes'
import { usePanelProperty } from '../../../redux/hooks/panelsHooks'
import { titleFromFileName, useFile } from '../../../redux/hooks/workingDirectoryHooks'
import { PanelContext } from './CollectionPanel'
import { useEffect } from 'react'
import { parameterMap } from '../assembly-editor/AssemblyForm'


export default function ExperimentalTable() {

    const panelId = useContext(PanelContext)

    const experimentalId = usePanelProperty(panelId, 'experimental', false)
    const experimentalFile = useFile(experimentalId)
    const experimentalFileObjectType = getObjectType(experimentalFile?.objectType)

    const XDCdataID = usePanelProperty(panelId, 'XDCdataID', false)
    const XDCdataFile = useFile(XDCdataID)

    // Debug logs
    console.log("experimentalId: ", experimentalId);
    console.log("XDCdataID: ", XDCdataID);
    console.log("experimentalFile: ", experimentalFile);
    console.log("experimentalFile name: ", experimentalFile?.name);
    console.log("XDCdataFile: ", XDCdataFile);
    console.log("XDCdataFile name: ", XDCdataFile?.name);

    const partInserttableOfcontents = () => {

        // if (!experimentalFile || !XDCdataFile) {
        //     return (
        //         <tr>
        //             <td colSpan={2}>
        //                 <Text color="dimmed">Loading files...</Text>
        //             </td>
        //         </tr>
        //     );
        // }

        return <>
            <tr>
                <td><Text weight={600}>Experimental Metadata:</Text></td>
                <td>
                    <Group position='right'>
                        <Text weight={600}>{titleFromFileName(experimentalFile?.name)}</Text>
                        {/*<Text weight={600}>{ experimentalFile ? titleFromFileName(experimentalFile.name) : "No file found"}</Text>*/}
                        {experimentalFileObjectType?.badgeLabel &&
                            <Badge>{experimentalFileObjectType.badgeLabel}</Badge>}
                    </Group>
                </td>
            </tr>
            <tr>
                <td><Text weight={600}>Experimental Results:</Text></td>
                <td>
                    <Group position='right'>
                        <Text weight={600}>{titleFromFileName(XDCdataFile?.name)}</Text>
                        {/*<Text weight={600}>{XDCdataFile ? titleFromFileName(XDCdataFile.name) : "No file found"}</Text>*/}
                        {experimentalFileObjectType?.badgeLabel &&
                            <Badge>{experimentalFileObjectType.badgeLabel}</Badge>}
                    </Group>
                </td>
            </tr>
        </>
    }

    return (
        <Container>
            <Table horizontalSpacing={20}>
                <thead>
                    <tr>
                        <th>
                        </th>
                        <th>
                            <Group position='right'>
                                <Text weight={600}>{titleFromFileName(XDCdataFile?.name)}</Text>
                                {experimentalFileObjectType?.badgeLabel &&
                                    <Badge>{experimentalFileObjectType.badgeLabel}</Badge>}
                            </Group>
                        </th>
                    </tr>
                </thead>
                <tbody>
                {partInserttableOfcontents()}
                </tbody>
            </Table>
        </Container>
    )
}
