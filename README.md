![readme-pic](https://user-images.githubusercontent.com/11147616/196558743-5a5e2c03-0731-4f56-aca4-5430a56c7e8a.png)


# SynBioSuite

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
The endpoint for the iBioSim API. The application expects it to be behind an instance of the [iBioSim API Connector](https://github.com/zachsents/iBioSim-API-Connector). A public instance is available here: `https://ibiosimconnector.azurewebsites.net/api/orchestrators/analyze`

`VITE_SBOL_CANVAS_URL`
An instance of [SBOLCanvas](https://github.com/SynBioDex/SBOLCanvas/tree/synbio-suite). A public one is available here: `https://sbolcanvas.org`
## Deployment

This project uses Vite for building. To build, run:

```bash
npm run build
```

The built files will be in the `dist` directory.
