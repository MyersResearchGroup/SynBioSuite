# Developers: Known Gaps

## Product surface gaps

1. OneDrive flow remains code-present but hidden from the main routed user entry.
2. Local Chromium-only workflow is still the explicitly promoted user path.

## Integration and behavior gaps

3. Resource upload contract mismatch between frontend payload fields and backend expectations.
4. SBOL save operation includes implicit SBML sibling write behavior that is not surfaced as a first-class product feature.

## Backend maturity gaps

5. `uploadAssembly` and `uploadTransformation` return 501.
6. `build_pudu` returns 501.
7. `sbol_2_build_golden_gate` appears incomplete.
8. Flask startup patterns are inconsistent (singleton/app-factory/stale startup script).

## Infrastructure/documentation gaps

9. `iac/main.tf` scope is partial and URI configuration needs correction.
10. README/backend-runtime guidance drift exists.
11. `LocalHome.jsx` renders `UnifiedModal` twice.
