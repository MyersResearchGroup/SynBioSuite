![readme-pic](https://user-images.githubusercontent.com/11147616/196558743-5a5e2c03-0731-4f56-aca4-5430a56c7e8a.png)

# SynBioSuite

A web app to support the synthetic biology workflow. 

## Public Instance

A version of SynBioSuite is available at https://synbiosuite.org.

# Frontend

## Run Locally

Clone the project

```bash
git clone https://github.com/MyersResearchGroup/SynBioSuite
```

Go to the project directory

```bash
cd frontend
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

# Backend

A Python Flask server that supports SynBioSuite's interface with SynBioHub and Flapjack

## Run locally using Docker

Go to main directory:

```bash
cd backend
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

## Working with Local Services

If you are running SynBioHub or Flapjack locally, you will need this command to allow the backend to communicate with these other local instances:

```bash
docker network connect synbio-network synbiosuite
```
