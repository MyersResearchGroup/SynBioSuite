![readme-pic](https://user-images.githubusercontent.com/11147616/196558743-5a5e2c03-0731-4f56-aca4-5430a56c7e8a.png)


# SynBioSuite

## SynBioHub-populated metadata templates

Downloading a metadata template can populate its hidden `SBH_*` lookup table from one selected SynBioHub collection. SynBioSuite uses the chosen repository's API endpoint and validated session, queries the authenticated profile graph, and preserves VBA plus unrelated OOXML parts while updating only the target worksheet/table parts.

| Object type | Template | Lookup table | Role / SBOL type / RDF class | Evidence |
| --- | --- | --- | --- | --- |
| Strains | `Strains.xlsm` | `SBH_chassis_collections` | engineered plasmid `SO:0000637` | Required proven mapping |
| Strains | `Strains.xlsm` | `SBH_plasmids_collections` | engineered plasmid `SO:0000637` | Strain plasmid lookup in generator + actual workbook |
| Sample Designs | `SampleDesign.xlsm` | `SBH_strains_collection` | NCIT_C97158 / — / ModuleDefinition | `sheet_definitions.py` and builder role map |
| Sample Designs | `SampleDesign.xlsm` | `SBH_media_collection` | NCIT:C48164 / — / ModuleDefinition | `sheet_definitions.py` and builder role map |
| Sample Designs | `SampleDesign.xlsm` | `SBH_chemicals_collection` | — / BioPAX SmallMolecule / ComponentDefinition | Chemical definition and converter output |
| Resources | `Resources.xlsm` | none | — | Actual workbook has no SBH table |
| Metadata | `Assay.xlsm` | `SBH_sampledesigns_collection` | SynBioSuite SampleDesign / — / ModuleDefinition | Actual Assay workbook and Sample definition |

The upstream `Study.xlsm` was removed; Metadata intentionally uses the current `Assay.xlsm` replacement. For an opt-in live integrity check, use a temporary token only:

```sh
cd frontend
SBH_TEST_TOKEN='<temporary-token>' npm run test:sbh-template-live
```

The live test writes its workbook and token-free JSON integrity report under `tmp/sbh-template-live` by default. Rotate any token that was previously pasted into chat or source control.

A web app for the design and analysis of genetic circuits. This repository is just the SPA, and doesn't include SBOLCanvas or the iBioSim API. See *Environment Variables* section below.




## Public Instance

A version of SynBioSuite is available at https://synbiosuite.org.
## Run Locally

Clone the project

```bash
git clone https://github.com/MyersResearchGroup/SynBio-Suite
```

Go to the project directory

```bash
cd SynBio-Suite
```

Install dependencies

```bash
npm install
```

Add .env file (see *Environment Variables* section below). 

Start the development server

```bash
npm run dev
```


## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`VITE_IBIOSIM_API`
The endpoint for the iBioSim API. The application expects it to be behind an instance of the [iBioSim API Connector](https://github.com/zachsents/iBioSim-API-Connector). A public instance is available here: `https://ibiosimconnector-api.azurewebsites.net/api/orchestrators/analyze`

`VITE_SBOL_CANVAS_URL`
An instance of [SBOLCanvas](https://github.com/SynBioDex/SBOLCanvas/tree/synbio-suite). A public one is available here: `https://sbolcanvas.org`
## Deployment

This project uses Vite for building. To build, run:

```bash
npm run build
```

The built files will be in the `dist` directory.
