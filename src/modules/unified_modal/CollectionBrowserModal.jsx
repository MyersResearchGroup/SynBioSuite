import { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Stack, 
    Table, 
    ScrollArea, 
    Button, 
    Group, 
    Text, 
    Breadcrumbs, 
    Anchor,
    Badge,
    Loader,
    Center,
    Checkbox,
    Paper,
    Divider,
    ActionIcon,
    Tooltip
} from '@mantine/core';
import { searchCollections } from '../../API';
import { useLocalStorage } from '@mantine/hooks';
import {FaTimes } from 'react-icons/fa';

/**
 * Collection Browser Modal - Step 3 of the workflow
 * Shows hierarchical collection browsing with multi-select
 */
export default function CollectionBrowserModal({ 
    navigateTo, 
    goBack, 
    completeWorkflow,
    onCancel 
}) {
    const [dataSBH] = useLocalStorage({ key: "SynbioHub", defaultValue: [] });
    const [dataPrimarySBH] = useLocalStorage({ key: "SynbioHub-Primary", defaultValue: "" });

    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCollections, setSelectedCollections] = useState(new Map()); // URI -> collection object
    const [breadcrumbs, setBreadcrumbs] = useState([{ name: 'Root', uri: null }]);
    const [currentPath, setCurrentPath] = useState([]);
    const [expandedCollections, setExpandedCollections] = useState(new Map()); // URI -> children

    const isMountedRef = useRef(true);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Get auth token for current repository
    const getAuthToken = useCallback(() => {
        if (!dataPrimarySBH || !dataSBH.length) return null;
        const repo = dataSBH.find(r => r.value === dataPrimarySBH);
        return repo?.authtoken || null;
    }, [dataPrimarySBH, dataSBH]);

    // Fetch collections at current level
    const fetchCollections = useCallback(async (parentUri = null) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setLoading(true);

        try {
            const authToken = getAuthToken();
            const url = dataPrimarySBH;

            if (!url || url.startsWith('Select')) {
                setCollections([]);
                return;
            }

            // If fetching subcollection, need different API call
            // For now, using searchCollections at root level
            const result = await searchCollections(url, authToken);

            if (abortController.signal.aborted || !isMountedRef.current) return;

            const collectionList = Array.isArray(result) ? result : [];
            
            // Filter by parent if needed (this would need API support for subcollections)
            setCollections(collectionList);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error fetching collections:', err);
                setCollections([]);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [dataPrimarySBH, getAuthToken]);

    // Initial fetch
    useEffect(() => {
        fetchCollections();
    }, [fetchCollections]);

    // Toggle selection of a collection
    const toggleSelection = useCallback((collection) => {
        setSelectedCollections(prev => {
            const newMap = new Map(prev);
            if (newMap.has(collection.uri)) {
                newMap.delete(collection.uri);
            } else {
                newMap.set(collection.uri, collection);
            }
            return newMap;
        });
    }, []);

    // Remove a selected collection
    const removeSelection = useCallback((uri) => {
        setSelectedCollections(prev => {
            const newMap = new Map(prev);
            newMap.delete(uri);
            return newMap;
        });
    }, []);

    // Handle double-click to navigate into subcollection
    const handleDoubleClick = useCallback(async (collection) => {
        // Check if this collection has subcollections (you'd need API support)
        // For now, we'll simulate this with a flag or API call
        
        // Add to breadcrumb trail
        setBreadcrumbs(prev => [...prev, { name: collection.name, uri: collection.uri }]);
        setCurrentPath(prev => [...prev, collection.uri]);
        
        // Fetch subcollections
        await fetchCollections(collection.uri);
    }, [fetchCollections]);

    // Navigate breadcrumbs
    const navigateToBreadcrumb = useCallback((index) => {
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        const newPath = currentPath.slice(0, index);
        
        setBreadcrumbs(newBreadcrumbs);
        setCurrentPath(newPath);
        
        const parentUri = newPath[newPath.length - 1] || null;
        fetchCollections(parentUri);
    }, [breadcrumbs, currentPath, fetchCollections]);

    // Complete the workflow
    const handleComplete = useCallback(() => {
        if (selectedCollections.size === 0) {
            // Don't complete if nothing selected
            return;
        }

        const selectedArray = Array.from(selectedCollections.values());
        completeWorkflow({
            collections: selectedArray,
            count: selectedCollections.size,
        });
    }, [selectedCollections, completeWorkflow]);

    // Cancel without completing
    const handleCancel = useCallback(() => {
        if (onCancel) {
            onCancel();
        } else {
            goBack();
        }
    }, [onCancel, goBack]);

    return (
        <Stack spacing="md" style={{ height: '70vh', display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'stretch', padding: 0 }}>
            {/* Breadcrumbs for navigation */}
            <Breadcrumbs style={{ width: '100%' }}>
                {breadcrumbs.map((crumb, index) => (
                    <Anchor
                        key={crumb.uri || 'root'}
                        onClick={() => navigateToBreadcrumb(index)}
                        style={{ cursor: 'pointer' }}
                    >
                        {crumb.name}
                    </Anchor>
                ))}
            </Breadcrumbs>

            {/* Selected collections display */}
            {selectedCollections.size > 0 && (
                <Paper p="sm" withBorder>
                    <Text size="sm" weight={500} mb="xs">
                        Selected Collections ({selectedCollections.size})
                    </Text>
                    <Group spacing="xs">
                        {Array.from(selectedCollections.values()).map(collection => (
                            <Badge
                                key={collection.uri}
                                rightSection={
                                    <ActionIcon
                                        size="xs"
                                        color="blue"
                                        radius="xl"
                                        variant="transparent"
                                        onClick={() => removeSelection(collection.uri)}
                                    >
                                        <FaTimes size={10} />
                                    </ActionIcon>
                                }
                                pr={3}
                            >
                                {collection.displayId}
                            </Badge>
                        ))}
                    </Group>
                </Paper>
            )}

            <Divider />

            {/* Collections table */}
            <ScrollArea style={{ flex: 1, width: '100%', overflowX: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0, alignItems: 'stretch' }} type="always">
                {loading ? (
                    <Center style={{ height: 300 }}>
                        <Loader />
                    </Center>
                ) : collections.length === 0 ? (
                    <Center style={{ height: 300 }}>
                        <Text color="dimmed">No collections found</Text>
                    </Center>
                ) : (
                    <div style={{ flex: 1, display: 'flex', minHeight: 0, alignItems: 'stretch', width: '100%' }}>
                        <Table highlightOnHover withColumnBorders style={{ display: 'block', width: '100%', tableLayout: 'fixed', minWidth: '100%', flex: '1 1 auto' }}>
                            <colgroup>
                                <col style={{ width: '10%' }} />
                                <col style={{ width: '20%' }} />
                                <col style={{ width: '35%' }} />
                                <col style={{ width: '10%' }} />
                                <col style={{ width: '25%' }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th style={{ width: '8%' }}>Select</th>
                                    <th>Display ID</th>
                                    <th>Name</th>
                                    <th>Version</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {collections.map((collection) => (
                                    <tr
                                        key={collection.uri}
                                        onDoubleClick={() => handleDoubleClick(collection)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                            <Checkbox
                                                checked={selectedCollections.has(collection.uri)}
                                                onChange={() => toggleSelection(collection)}
                                            />
                                        </td>
                                        <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{collection.displayId}</td>
                                        <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{collection.name}</td>
                                        <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{collection.version}</td>
                                        <td style={{ 
                                            overflowWrap: 'break-word',
                                            wordBreak: 'break-word',
                                            whiteSpace: 'normal'
                                        }}>
                                            {collection.description}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
            </ScrollArea>

            {/* Action buttons */}
            <Group position="apart" mt="md">
                <Button variant="default" onClick={handleCancel}>
                    Cancel
                </Button>
                <Group>
                    {breadcrumbs.length > 1 && (
                        <Button variant="subtle" onClick={() => navigateToBreadcrumb(breadcrumbs.length - 2)}>
                            Back to Parent
                        </Button>
                    )}
                    <Button 
                        onClick={handleComplete}
                        disabled={selectedCollections.size === 0}
                    >
                        Confirm Selection ({selectedCollections.size})
                    </Button>
                </Group>
            </Group>
        </Stack>
    );
}
