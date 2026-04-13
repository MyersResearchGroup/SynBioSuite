# Users: Activities

Activities are the left-sidebar navigation categories. Most open an explorer filtered to specific object/file types.

## Sidebar activities

| Activity | ID | Current behavior |
| --- | --- | --- |
| Entire Workflow | `synbio.activity.entire-workflow` | Shows all configured object types in one explorer. |
| Resources | `synbio.activity.resource-selection` | Focuses on Resources and SynBioHub repository entries. |
| Design | `synbio.activity.design` | Focuses on SBOL design files. |
| Model | `synbio.activity.models` | Focuses on SBML, OMEX, and Analysis files. |
| Build | `synbio.activity.build` | Focuses on Plasmids, Strains, and Build Plans. |
| Test | `synbio.activity.test` | Focuses on Sample Designs, Studies, Metadata, Results, and Plate Reader output. |
| Learn | `synbio.activity.learn` | Focuses on Flapjack repository entries. |
| Check Login Status | `synbio.activity.login-status-panel` | Opens login status/modal behavior in the local flow. |
| GitHub and Website | `synbio.activity.GitHub` | Opens project links/activity view. `[placeholder: explain exact links and expected user actions]` |
| Report Bug | `synbio.activity.bug-report` | Opens bug-report activity view. `[placeholder: explain where reports are submitted]` |

## Conditional Microsoft activities

When Microsoft account state is active, additional activities are available in code:

- **Check Microsoft Login Status** (`synbio.activity.microsoft-status`)
- **OneDrive Explorer** (`synbio.activity.microsoft-file-explorer`)

These are conditional additions and are not part of the default landing-to-local workflow.
