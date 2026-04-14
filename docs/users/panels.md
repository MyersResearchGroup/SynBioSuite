# Users: Panels

Panels are the center workspace tabs. Opening a file chooses a panel type based on object type.

## Panel types

| Panel | ID | Typical object types | What users do there |
| --- | --- | --- | --- |
| Uploader | `synbio.panel-type.resources` | Resources, Strains, Sample Designs, Metadata | Prepare upload/resource-related metadata payloads. `[placeholder: explain exact service targets per upload mode]` |
| iBioSim Analysis | `synbio.panel-type.simulator` | Analysis, SBML | Run/prepare model-analysis workflows and SBML-related analysis payloads. |
| SBOL Canvas | `synbio.panel-type.sbol-editor` | SBOL, Plasmids | Edit SBOL designs using embedded SBOLCanvas behavior. |
| Build Plans | `synbio.panel-type.buildplans` | Build Plans | Work with build plan JSON-based content. |
| Data Collector | `synbio.panel-type.data-collector` | Studies (`.xdc`) | Manage study/collection workflows. `[placeholder: explain user-visible lifecycle for study collection and publish steps]` |
| Experimental Setup | `synbio.panel-type.excel-file` | Metadata spreadsheets | Open and save metadata spreadsheet payloads in panel workflow. |
| SynBioHub | `synbio.panel-type.synbiohub` | repository/integration panel | Work with SynBioHub repositories/collections. `[placeholder: explain currently supported import/search/upload actions]` |
| SeqImprove | `synbio.panel-type.seqimprove` | integration panel | Open SeqImprove integration flow for sequence-related tasks. `[placeholder: explain exact handoff and return flow]` |

## Panel behavior notes

- Tabs are reorderable.
- Save behavior depends on panel type.
- SBOL saves also trigger a sibling `_sbml.xml` write in the local workspace.
- Empty workspace state shows a welcome/empty experience before files are opened.
