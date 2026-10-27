import { Alert, Badge, Button, ColorSwatch, Group, List, Loader, Modal, ScrollArea, Select, Stack, Text } from '@mantine/core'

const ACTIONS = {
    new: ['New', 'green'],
    replace: ['Replaces the earlier upload', 'yellow'],
    unchanged: ['Already in BOB, unchanged', 'gray'],
}

function partsText(parts) {
    return parts
        .filter((p) => p.role !== 'design')
        .map((p) => p.label + (p.amount != null ? ` ${p.amount}${p.unit ? ' ' + p.unit : ''}` : ''))
        .join(', ')
}

// What BOB found in an upload, shown before SynBioSuite writes anything to SynBioHub or BOB.
export default function BOBCheckModal({ review, onPair, onConfirm, onCancel }) {
    const found = review?.found
    const assays = (found?.workbook.assays || []).filter((a) => a.wells)
    const choosing = found?.pairing.some((p) => p.source !== 'only one')

    return (
        <Modal opened={!!review} onClose={onCancel} title="What BOB will do with this upload" size="lg">
            {!found ? <Group position="center"><Loader /></Group> : (
                <Stack spacing="md">
                    {found.problems.length > 0 && (
                        <Alert color="red" title="Not ready to upload">
                            <List size="sm">{found.problems.map((p) => <List.Item key={p}>{p}</List.Item>)}</List>
                        </Alert>
                    )}
                    {choosing && found.pairing.map((p) => (
                        <Select
                            key={p.plate}
                            label={`Which assay ${p.plate} holds`}
                            description={review.suggested?.[p.plate] && review.suggested[p.plate] === review.pairing[p.plate]
                                ? 'Prefilled from the file name; check it.' : 'BOB does not take this from the order of the assays.'}
                            placeholder="Choose the assay"
                            data={assays.map((a) => ({ value: a.id, label: `${a.name} (${a.id}, ${a.wells} wells)` }))}
                            value={review.pairing[p.plate] ?? p.assay_id ?? null}
                            onChange={(value) => onPair({ ...review.pairing, [p.plate]: value })}
                            disabled={review.busy}
                        />
                    ))}
                    {found.assays.map((a) => (
                        <div key={a.workbook_assay_id}>
                            <Group spacing="xs">
                                <Text weight={600}>{a.name}</Text>
                                <Badge color={ACTIONS[a.action][1]}>{ACTIONS[a.action][0]}</Badge>
                                <Text size="sm" color="dimmed">{a.plate}, {a.wells} wells</Text>
                            </Group>
                            <List size="sm" type="ordered" mt={4}>
                                {a.channels.map((c) => (
                                    <List.Item key={c.read} icon={c.color ? <ColorSwatch color={c.color} size={10} /> : undefined}>
                                        <b>{c.name}</b>{c.description ? `, ${c.description}` : ''} <Text component="span" color="dimmed">read as {c.label}</Text>
                                    </List.Item>
                                ))}
                            </List>
                        </div>
                    ))}
                    {found.samples.length > 0 && (
                        <ScrollArea.Autosize maxHeight={260}>
                            <Text weight={600} mb={4}>Samples from the sample designs</Text>
                            <List size="sm" spacing={4}>
                                {found.samples.map((s) => (
                                    <List.Item key={s.name}>
                                        <b>{s.name}</b>{s.parts.length > 1 ? `: ${partsText(s.parts)}` : ''}
                                        {s.error && <Text size="xs" color="orange">Not read from SynBioHub: {s.error}</Text>}
                                    </List.Item>
                                ))}
                            </List>
                        </ScrollArea.Autosize>
                    )}
                    {found.warnings.length > 0 && (
                        <Alert color="yellow" title={`${found.warnings.length} warning(s)`}>
                            <List size="sm">{found.warnings.map((w) => <List.Item key={w}>{w}</List.Item>)}</List>
                        </Alert>
                    )}
                    <Group position="right">
                        <Button variant="default" onClick={onCancel}>Cancel</Button>
                        <Button onClick={onConfirm} disabled={!found.ok || review.busy} loading={review.busy}>Upload</Button>
                    </Group>
                </Stack>
            )}
        </Modal>
    )
}
