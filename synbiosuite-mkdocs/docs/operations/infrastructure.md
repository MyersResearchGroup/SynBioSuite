# Infrastructure

## What `iac/` currently contains

The `iac/` directory is focused on Microsoft identity setup, not full environment provisioning.

### Current Terraform scope

- Azure AD application registration
- Microsoft Graph delegated scopes
- output path meant to support `VITE_CLIENT_ID`

## Microsoft Graph scopes requested

The Terraform file currently requests delegated access for:

- profile
- openid
- Files.ReadWrite

## Important repo-state note

The infrastructure code should currently be treated as partial because:

- the Terraform in `iac/main.tf` only covers Azure AD application setup
- it does not provision the frontend host, backend host, or container infrastructure
- the redirect URI list in `iac/main.tf` is malformed and needs correction before it can be treated as production-ready

## Frontend auth config mismatch

The frontend auth initializer still hardcodes localhost redirect values:

- `http://localhost:3000/onedrive`
- `http://localhost:3000/`

That means the Azure AD / OneDrive setup is not yet fully aligned with a production deployment flow.
