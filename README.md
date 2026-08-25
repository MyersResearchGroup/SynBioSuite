![readme-pic](https://user-images.githubusercontent.com/11147616/196558743-5a5e2c03-0731-4f56-aca4-5430a56c7e8a.png)

# SynBioSuite

A web app for the design and analysis of genetic circuits. This repository is just the SPA, and doesn't include SBOLCanvas or the iBioSim API. See _Environment Variables_ in the frontend section below.

## Exporting RO-Crates and Licensing

With a saved study open, use the package button labeled **Export RO Crate** to download the study. The downloaded `.omex` file is a ZIP-compatible package that contains both RO-Crate JSON-LD metadata (`ro-crate-metadata.json`) and a COMBINE Archive manifest (`manifest.xml`), along with the study files.

The export omits SynBioSuite's internal `study.json`, any stale generated `assays.json`, and the workflow JSON sidecars directly under `resources`, `strains`, and `sampleDesigns`; scientific JSON files elsewhere remain part of the archive. Assay `.xdc` files are included in a compact form containing only the selected assay metadata, experimental-results, and plate-reader file paths. This lets collaborators restore those selections after recreating the files at the same relative paths, while repository connections and authentication come from their own SynBioSuite study.

SynBioSuite software is licensed under the Apache License 2.0. During export, SynBioSuite automatically selects the data license. If the study root contains a file named exactly `DATA_LICENSE.md`, the exporter preserves it and links to it as the dataset license. Otherwise, the exporter creates a license notice and applies the [Creative Commons Attribution 4.0 International license](https://creativecommons.org/licenses/by/4.0/) by default.

To replace the default license, add or replace `DATA_LICENSE.md` at the study root with the desired terms before exporting. Remove that custom file to return to the default CC BY 4.0 license. Creative Commons licenses are generally irrevocable, so only someone authorized to license the study data should apply the default license. Uploaded third-party material may retain separate terms, which researchers remain responsible for respecting.

## Public Instance

A version of SynBioSuite is available at https://synbiosuite.org.

# Frontend

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

Add .env file (see _Environment Variables_ section below).

Start the development server

```bash
npm run dev
```

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`VITE_SYNBIOSUITE_API`
The endpoint for the SynBioSuite Server. When running your own backend server, it should be set to: `http://127.0.0.1:5003`

`VITE_IBIOSIM_API`
The endpoint for the iBioSim API. The application expects it to be behind an instance of the [iBioSim API Connector](https://github.com/zachsents/iBioSim-API-Connector). A public instance is available here: `https://ibiosimconnector-api.azurewebsites.net/api/orchestrators/analyze`

`VITE_SBOL_CANVAS_URL`
An instance of [SBOLCanvas](https://github.com/SynBioDex/SBOLCanvas). A public one is available here: `https://sbolcanvas.org`

`VITE_SEQIMPROVE_URL`
An instance of [SeqImprove](https://github.com/MyersResearchGroup/SeqImprove). A public one is available here: `https://seqimprove.org`

## Deployment

This project uses Vite for building. To build, run:

```bash
npm run build
```

The built files will be in the `dist` directory.

# Backend

## SynBioSuite_Server

A Python Flask server that converts Excel files into SBOL and uploads it into SBH and FJ

## Current Usage (2/5/25)

### WARNING:

May have to edit dockerfile line 2 to clarify the platform on which you are running. (--platform=...)

Currently in a template-based design.

Go to main directory:

```bash
cd SynBioSuite_Server
```

Build the image:

```bash
docker build -t sbs_server .
```

Run the image:

```bash
docker run -p 5003:5003 sbs_server
```

The server will be running on localhost:5003

## Installation

This package requires Python 3.9.20 (other version create dependency issues). Use the package manager pip to install excel2sbol, excel2flapjack, flask, and flask-cors.

```bash
pip install excel2sbol
```

```bash
pip install excel2flapjack
```

```bash
pip install flask
```

```bash
pip install flask-cors
```

## Usage

In your command line, you can start up the server using the following command

```bash
flask --app views.py run
```
