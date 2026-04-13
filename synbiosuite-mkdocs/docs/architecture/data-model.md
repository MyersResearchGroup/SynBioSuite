# Data model and workspace

## Object types

The frontend centers much of its behavior on `ObjectTypes`. These determine:

- labels shown in the UI
- file matching and import behavior
- subdirectory conventions
- which panel type opens a file

## Workspace-oriented object types

| Object type | Typical files | Subdirectory |
| --- | --- | --- |
| Resources | `.json` | `resources/` |
| SBOL / Design | XML with SBOL content | none required |
| SBML / Model | SBML XML | none required |
| OMEX Archive | `.omex` | none required |
| Analysis | `.analysis` | none required |
| Plasmids | `.xml` | `plasmids/` |
| Strains | `.xlsx`, `.xlsm` | `strains/` |
| Build Plans | `.json` | `buildPlans/` |
| Sample Designs | `.xlsx`, `.xlsm` | `sampleDesigns/` |
| Metadata | `.xlsx`, `.xlsm` | `experimentalSetups/` |
| Experimental Results | `.xlsx`, `.xlsm` | `experimentalResults/` |
| Plate Reader Output | `.xlsx`, `.xlsm` | `plateReaderOutputs/` |
| Studies | `.xdc` | `xdc/` |

Repository-like object types also exist for SynBioHub and Flapjack.

## File classification rules

The current frontend classifies files by:

1. filename pattern when no subdirectory is available
2. file contents for some text-based formats
3. parent subdirectory when working inside the local workspace structure

## Panel mapping

Files are opened into panel types based on object type. Examples:

- SBOL -> SBOL Canvas panel
- SBML / Analysis -> iBioSim Analysis panel
- Build Plans -> Build Plans panel
- Metadata -> Experimental Setup panel

## Save behavior worth documenting

When an SBOL file is saved, the frontend also writes a sibling SBML file using the same base name with `_sbml.xml` appended.

## Example local workspace shape

```text
workspace/
  resources/
  plasmids/
  strains/
  buildPlans/
  sampleDesigns/
  experimentalSetups/
  experimentalResults/
  plateReaderOutputs/
  xdc/
```

This is the cleanest mental model for the local-first product path.
