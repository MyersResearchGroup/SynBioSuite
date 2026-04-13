# Panels

## Overview

Panels are the main working tabs in the center of the application. They are opened based on file object type and support save / serialize behavior per panel type.

## Current panel types

| Panel title | ID | Main object types |
| --- | --- | --- |
| Uploader | `synbio.panel-type.resources` | Resources, Strains, Sample Designs, Metadata |
| iBioSim Analysis | `synbio.panel-type.simulator` | Analysis, SBML |
| SBOL Canvas | `synbio.panel-type.sbol-editor` | SBOL, Plasmids |
| Build Plans | `synbio.panel-type.buildplans` | Build Plans |
| Data Collector | `synbio.panel-type.data-collector` | Studies |
| Experimental Setup | `synbio.panel-type.excel-file` | Metadata |
| SynBioHub | `synbio.panel-type.synbiohub` | Repository-style integration panel |
| SeqImprove | `synbio.panel-type.seqimprove` | SeqImprove integration panel |

## Panel behavior

### Serialization

Each panel type defines how file contents are read and written. Examples:

- JSON-backed panels parse and serialize structured state
- SBOL panels store XML text and fall back to a blank SBOL document when empty
- Simulator panels can treat raw SBML text specially
- Excel-file panels keep a file blob / buffer style payload

### Workspace UX

Panels are:

- tab-based
- reorderable
- tied into Redux state
- responsible for save behavior through command helpers

### Empty state

When no files are open, the workspace shows a welcome screen or a minimal empty message depending on first-visit state.
