const SECRET_KEYS = new Set([
    'accessToken',
    'authToken',
    'authtoken',
    'fj_pass',
    'fj_token',
    'password',
    'refresh',
    'refreshToken',
    'sbh_pass',
    'sbh_token',
]);

export function withoutCredentials(value) {
    if (Array.isArray(value)) return value.map(withoutCredentials);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
        Object.entries(value)
            .filter(([key]) => !SECRET_KEYS.has(key))
            .map(([key, child]) => [key, withoutCredentials(child)]),
    );
}

export function requiredApprovalIds(plan) {
    return (plan?.required_approvals || [])
        .map((approval) => typeof approval === 'string' ? approval : approval?.id)
        .filter(Boolean);
}

export function approvalsAreComplete(plan, approvals = []) {
    return requiredApprovalIds(plan).every((id) => approvals.includes(id));
}

export function buildRunFilename(planId, createdAt = new Date()) {
    const timestamp = createdAt.toISOString().replace(/[:.]/g, '-');
    return `build-${planId.slice(0, 12)}-${timestamp}.build.json`;
}

export function createBuildRunRecord({
    response,
    createdAt,
    design,
    collections,
    options,
    plan,
    approvals,
    request,
}) {
    return withoutCredentials({
        schema_version: response.schema_version,
        created_at: createdAt.toISOString(),
        activeStep: 6,
        design,
        collections,
        options,
        plan,
        approvals,
        result: response,
        build_request: request,
    });
}
