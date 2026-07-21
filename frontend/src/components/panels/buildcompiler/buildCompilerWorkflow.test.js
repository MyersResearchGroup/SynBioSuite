import assert from 'node:assert/strict';
import test from 'node:test';

import {
    approvalsAreComplete,
    buildRunFilename,
    createBuildRunRecord,
    requiredApprovalIds,
    withoutCredentials,
} from './buildCompilerWorkflow.js';

test('approval helpers accept only every explicit BuildCompiler approval', () => {
    const plan = {
        required_approvals: [
            { id: 'sequence-edit', description: 'Allow sequence edit' },
            'large-order',
        ],
    };

    assert.deepEqual(requiredApprovalIds(plan), ['sequence-edit', 'large-order']);
    assert.equal(approvalsAreComplete(plan, ['sequence-edit']), false);
    assert.equal(approvalsAreComplete(plan, ['sequence-edit', 'large-order']), true);
});

test('saved BuildCompiler records are reopenable and recursively secret-free', () => {
    const createdAt = new Date('2026-07-20T12:34:56.789Z');
    const record = createBuildRunRecord({
        response: {
            schema_version: '1.0',
            plan_id: 'abcdef0123456789',
            authToken: 'response-secret',
            result: { status: 'success' },
        },
        createdAt,
        design: { uri: 'https://example/design', accessToken: 'design-secret' },
        collections: [{ uri: 'https://example/parts', authtoken: 'legacy-secret' }],
        options: {},
        plan: { plan_id: 'plan-1' },
        approvals: ['approval-1'],
        request: { inventory: { refreshToken: 'refresh-secret' } },
    });

    assert.equal(record.activeStep, 6);
    assert.equal(record.created_at, '2026-07-20T12:34:56.789Z');
    assert.equal(record.design.uri, 'https://example/design');
    assert.equal(JSON.stringify(record).includes('secret'), false);
    assert.equal(
        buildRunFilename('abcdef0123456789', createdAt),
        'build-abcdef012345-2026-07-20T12-34-56-789Z.build.json',
    );
});

test('credential redaction preserves primitive values and non-secret metadata', () => {
    assert.deepEqual(withoutCredentials({
        registryURL: 'https://example',
        password: 'remove-me',
        nested: [{ username: 'scientist', fj_token: 'remove-me-too' }],
    }), {
        registryURL: 'https://example',
        nested: [{ username: 'scientist' }],
    });
});
